/** Optional native terminal-request recovery adapter. Never reconstructs or dispatches a request. */
import type {Context} from '@deepseek-ai/cordis';
import type {IncomingMessage,ServerResponse} from 'node:http';
export const REQUEST_RECOVERY_PROTOCOL='dsh.request-recovery.v1' as const;
export interface RecoveryCheckpoint {
 sessionId:string;checkpointId:string;revision:number;attemptId:string;attemptSeq:number;terminalSeq:number;turn:number;step:number;
 selection:{provider:string;model:string;reasoningEffort?:string};disposition:'budget-exhausted';
}
export interface RecoveryView {protocol:typeof REQUEST_RECOVERY_PROTOCOL;lifetime:'process-local';status:'available'|'unavailable';reason?:string;checkpoint?:RecoveryCheckpoint;}
export interface RecoveryCommand {sessionId:string;checkpointId:string;expectedRevision:number;operationId:string;}
export type RecoveryReceipt={status:'accepted';checkpointId:string;operationId:string;executionId:string}|{status:'rejected';reason:string};
const BODY_LIMIT=8192;
const record=(v:any):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:any):v is string=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\u0000-\u0020\u007f]/u.test(v);
const integer=(v:any):v is number=>Number.isSafeInteger(v)&&v>=0;
const reasons=new Set(['agent-detached','agent-busy','exact-snapshot-unavailable','checkpoint-stale','foreign-session','invalid-operation-id','recovery-policy-rejected','recovery-admission-failed']);
const code=(v:any,fallback='native-recovery-unavailable'):string=>typeof v==='string'&&reasons.has(v)?v:fallback;
const unavailable=(reason:string):RecoveryView=>({protocol:REQUEST_RECOVERY_PROTOCOL,lifetime:'process-local',status:'unavailable',reason});
/** Detach a bounded public checkpoint; raw model/provider errors never ride this route. */
export function acceptRecoveryView(raw:unknown,sessionId:string):RecoveryView {
 if(!record(raw)||raw.protocol!==REQUEST_RECOVERY_PROTOCOL||raw.lifetime!=='process-local')return unavailable('native-recovery-incompatible');
 if(raw.status==='unavailable')return unavailable(code(raw.reason));
 const p=raw.checkpoint;
 if(raw.status!=='available'||!record(p)||p.sessionId!==sessionId||!id(p.checkpointId)||!id(p.attemptId)||!['revision','attemptSeq','terminalSeq','turn','step'].every(k=>integer(p[k]))||p.disposition!=='budget-exhausted'||!record(p.selection)||!id(p.selection.provider)||!id(p.selection.model))return unavailable('native-recovery-incompatible');
 return {protocol:REQUEST_RECOVERY_PROTOCOL,lifetime:'process-local',status:'available',checkpoint:{sessionId,checkpointId:p.checkpointId,revision:p.revision,attemptId:p.attemptId,attemptSeq:p.attemptSeq,terminalSeq:p.terminalSeq,turn:p.turn,step:p.step,selection:{provider:p.selection.provider,model:p.selection.model,...id(p.selection.reasoningEffort)?{reasoningEffort:p.selection.reasoningEffort}:{}},disposition:'budget-exhausted'}};
}
/** Root mount; caller supplies accepted module participation, not browser intent. */
export function mountRequestRecovery(ctx:Context,distribution:string,isEnabled:()=>boolean=()=>false):void {
 ctx.inject(['webServer','connection','agents'],scope=>{
  const services=scope as any;let live=true;scope.effect(()=>()=>{live=false;});
  const handler=async(req:IncomingMessage,res:ServerResponse)=>{
   const reply=(status:number,body:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
   const refuse=(reason:string)=>reply(409,{status:'rejected',reason});
   try{
    const admission=services.connection.admit(req);if('rejection'in admission){res.writeHead(admission.rejection);res.end();return;}
    if(admission.peer.principal.kind!=='owner'){res.writeHead(403);res.end();return;}
    if(req.method!=='GET'&&req.method!=='POST'){res.writeHead(405,{Allow:'GET, POST'});res.end();return;}
    if(!live||!isEnabled()){if(req.method==='GET')reply(200,unavailable('module-disabled'));else refuse('module-disabled');return;}
    let command:RecoveryCommand|undefined;let sessionId:string;
    if(req.method==='GET'){
     const query=new URL(req.url??'','http://recovery.invalid').searchParams;
     if(query.getAll('sessionId').length!==1||[...query.keys()].some(k=>k!=='sessionId')||!id(query.get('sessionId'))){reply(400,{error:'invalid-recovery-query'});return;}
     sessionId=query.get('sessionId')!;
    }else{
     if(String(req.headers['content-type']??'').split(';')[0]!.trim().toLowerCase()!=='application/json'){reply(415,{error:'recovery-json-required'});return;}
     const length=Number(req.headers['content-length']);if(Number.isFinite(length)&&length>BODY_LIMIT){reply(413,{error:'recovery-body-too-large'});return;}
     const parts:Buffer[]=[];let size=0;
     for await(const part of req.iterator({destroyOnReturn:false})){const b=Buffer.isBuffer(part)?part:Buffer.from(part);size+=b.length;if(size>BODY_LIMIT){req.resume();reply(413,{error:'recovery-body-too-large'});return;}parts.push(b);}
     let value:any;try{value=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{reply(400,{error:'invalid-recovery-command'});return;}
     if(!record(value)||Object.keys(value).length!==4||Object.keys(value).some(k=>!['sessionId','checkpointId','expectedRevision','operationId'].includes(k))||!id(value.sessionId)||!id(value.checkpointId)||!id(value.operationId)||!integer(value.expectedRevision)){reply(400,{error:'invalid-recovery-command'});return;}
     command=value as RecoveryCommand;sessionId=command.sessionId;
    }
    // Look up only an existing live Agent; never load a cold Session or create an Agent.
    const agent=services.agents.get(sessionId);const capability=agent?.recovery;
    if(!capability||typeof capability.read!=='function'||typeof capability.retry!=='function'){
     if(command)refuse('native-recovery-unavailable');else reply(200,unavailable('native-recovery-unavailable'));return;
    }
    const raw=await capability.read();const view=acceptRecoveryView(raw,sessionId);
    if(!live||!isEnabled()){if(command)refuse('module-disabled');else reply(200,unavailable('module-disabled'));return;}
    if(!command){reply(200,view);return;}
    if(view.reason==='native-recovery-incompatible'||view.reason==='native-recovery-unavailable'){refuse(view.reason);return;}
    if(!live||!isEnabled()){refuse('module-disabled');return;}
    // Native validates latest failure/cancellation/admission and returns prior idempotent receipts,
    // including after its read has become unavailable. Never replace that with a plugin replay cache.
    const receipt=await capability.retry(command);
    if(record(receipt)&&receipt.status==='accepted'&&receipt.checkpointId===command.checkpointId&&receipt.operationId===command.operationId&&id(receipt.executionId))reply(200,{status:'accepted',checkpointId:receipt.checkpointId,operationId:receipt.operationId,executionId:receipt.executionId});
    else if(record(receipt)&&receipt.status==='rejected')refuse(code(receipt.reason,'native-recovery-rejected'));
    else reply(503,{error:'native-recovery-incompatible'});
   }catch{reply(503,{error:'native-recovery-unavailable'});}
  };
  scope.effect(()=>services.webServer.register({kind:'exact',path:'/extras/'+encodeURIComponent(distribution)+'/request-recovery',handler}));
 });
}
