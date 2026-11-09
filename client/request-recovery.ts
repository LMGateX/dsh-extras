/** Session-scoped optional native recovery UI; no prompt/message/provider APIs are used. */
import {acceptRecoveryView,type RecoveryCommand,type RecoveryReceipt,type RecoveryView} from '../src/modules/retry/recovery.ts';
import {useSettingsText} from './settings-ui.ts';
import {ownScope} from './scope.ts';
export interface RequestRecoveryMount {
 rowId:string;enabled():boolean;subscribe(listener:()=>void):()=>void;
}
export interface RecoverySource {read(sessionId:string,signal?:AbortSignal):Promise<RecoveryView>;retry(command:RecoveryCommand):Promise<RecoveryReceipt>;}
const rejected=(reason:string):RecoveryReceipt=>({status:'rejected',reason});
const known=new Set(['agent-detached','agent-busy','exact-snapshot-unavailable','checkpoint-stale','foreign-session','invalid-operation-id','recovery-policy-rejected','recovery-admission-failed','module-disabled','native-recovery-unavailable','native-recovery-incompatible','native-recovery-rejected']);
/** Same-origin cookie transport. Native owns checkpoint expiry, admission and idempotency. */
export function createRequestRecoverySource(rowId:string,fetcher:typeof fetch=fetch):RecoverySource {
 const path='/extras/'+encodeURIComponent(rowId)+'/request-recovery';
 return {
  async read(sessionId,signal){const r=await fetcher(path+'?sessionId='+encodeURIComponent(sessionId),{credentials:'same-origin',cache:'no-store',signal});if(!r.ok)throw Error('recovery-transport-unavailable');return acceptRecoveryView(await r.json(),sessionId);},
  async retry(command){const r=await fetcher(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});const value=await r.json();
   if(r.ok&&value?.status==='accepted'&&value.operationId===command.operationId&&value.checkpointId===command.checkpointId&&typeof value.executionId==='string')return {status:'accepted',checkpointId:value.checkpointId,operationId:value.operationId,executionId:value.executionId};
   if(r.status===409&&value?.status==='rejected')return rejected(known.has(value.reason)?value.reason:'native-recovery-rejected');
   throw Error('recovery-transport-unavailable');
  },
 };
}
interface Attempt {key:string;operationId:string;pending?:Promise<RecoveryReceipt>;receipt?:RecoveryReceipt;}
/** Parent selects this factory only in retry-bearing bundles, then owns mount disposal. */
export function createRequestRecoveryAdapter(React:any,environment?:{fetch?:typeof fetch;operationId?:()=>string}) {
 const h=React.createElement;const attempts=new Map<string,Attempt>();
 return {mount(ctx:any,options:RequestRecoveryMount):()=>void {
  const owned=ownScope(ctx);let disposed=false;
  const source=createRequestRecoverySource(options.rowId,environment?.fetch);
  owned.ctx.inject(['slots','sessions'],(scope:any)=>{
   const locale=scope.get('locale');
   function View({sessionId,session,turn}:{sessionId:string;session:any;turn:any}) {
    const t=useSettingsText(React,locale);
    const callbacks=React.useMemo(()=>({subscribe:(fn:()=>void)=>session?.subscribe(fn)??(()=>{}),read:()=>session?.getSnapshot()}),[session]);
    const sessionState=React.useSyncExternalStore(callbacks.subscribe,callbacks.read,callbacks.read);
    const [view,setView]=React.useState(undefined as RecoveryView|undefined);const [notice,setNotice]=React.useState('');const [busy,setBusy]=React.useState(false);const [refresh,setRefresh]=React.useState(0);
    const live=React.useRef(false);const pending=React.useRef(false);const generation=React.useRef(0);
    const terminalSeq=turn?.end?.seq;const closed=turn?.status==='closed'&&Number.isSafeInteger(terminalSeq);
    React.useEffect(()=>{live.current=true;return()=>{live.current=false;generation.current++;};},[]);
    React.useEffect(()=>{
     const token=++generation.current;setView(undefined);
     if(!closed||!session||sessionState?.running||!options.enabled()||disposed)return;
     const abort=new AbortController();
     source.read(sessionId,abort.signal).then(v=>{if(live.current&&token===generation.current&&!disposed&&options.enabled())setView(v);},()=>{if(live.current&&token===generation.current&&!abort.signal.aborted)setNotice('recovery-transport-unavailable');});
     return()=>abort.abort();
    },[sessionId,session,sessionState,turn?.turn,terminalSeq,closed,refresh]);
    const cp=view?.status==='available'?view.checkpoint:undefined;
    const matches=!!cp&&cp.sessionId===sessionId&&cp.turn===turn?.turn&&cp.terminalSeq===terminalSeq;
    const key=cp?cp.checkpointId+':'+cp.revision:'';
    const previous=attempts.get(sessionId);const accepted=previous?.key===key&&previous.receipt?.status==='accepted';
    const denied=previous?.key===key&&previous.receipt?.status==='rejected';
    async function retry(){
     if(pending.current||!matches||!cp||accepted||denied||disposed||!options.enabled()||session?.getSnapshot()?.running)return;
     const token=generation.current;pending.current=true;setBusy(true);setNotice('');
     let attempt=attempts.get(sessionId);
     if(attempt?.key!==key){attempt={key,operationId:environment?.operationId?.()??globalThis.crypto.randomUUID()};attempts.set(sessionId,attempt);}
     try{
      if(!attempt.pending&&!attempt.receipt)attempt.pending=source.retry({sessionId,checkpointId:cp.checkpointId,expectedRevision:cp.revision,operationId:attempt.operationId});
      const receipt=attempt.receipt??await attempt.pending!;attempt.receipt=receipt;
      if(live.current&&token===generation.current&&!disposed&&options.enabled()){setNotice(receipt.status==='accepted'?'accepted':receipt.reason);setRefresh((n:number)=>n+1);}
     }catch{if(live.current&&token===generation.current&&!disposed)setNotice('recovery-transport-unavailable');}
     finally{attempt.pending=undefined;pending.current=false;if(live.current&&!disposed)setBusy(false);}
    }
    if(!closed||!session||sessionState?.running||disposed||!options.enabled())return null;
    // A historical tail must not acquire a button for another terminal attempt.
    if(cp&&!matches)return null;
    const reason=notice==='accepted'?t('Recovery accepted; native execution started (not completed).','恢复已受理；原生执行已开始（尚未完成）。'):notice==='recovery-transport-unavailable'?t('Recovery transport unavailable; retrying uses the same operation identity.','恢复连接不可用；再次点击将使用相同操作标识。'):notice?t('Recovery rejected: ','恢复被拒绝：')+notice:view?.status==='unavailable'?t('Recovery unavailable: ','恢复不可用：')+(view.reason??'native-recovery-unavailable'):'';
    if(!matches&&!reason)return null;
    return h('div',{'data-request-recovery':true},
     reason?h('p',{role:notice&&notice!=='accepted'?'alert':'status'},reason):null,
     matches&&!accepted&&!denied?h('button',{type:'button',disabled:busy,onClick:()=>void retry()},t('Retry failed request','重试失败请求')):null,
     !busy&&reason?h('button',{type:'button',onClick:()=>{setNotice('');setRefresh((n:number)=>n+1);}},t('Refresh recovery state','刷新恢复状态')):null);
   }
   let remove:(()=>void)|undefined;
   const sync=()=>{
    if(!disposed&&options.enabled()&&!remove)remove=scope.slots.inject('conversation.chat.turnTail',()=>scope.slots.register({name:'conversation.chat.turnTail',id:options.rowId+'#request-recovery',inject:(sessionId:string)=>({sessionId,session:scope.sessions.binding(sessionId)?.session})},View));
    else if((disposed||!options.enabled())&&remove){const off=remove;remove=undefined;off();}
   };
   scope.effect(()=>{const off=options.subscribe(sync);sync();return()=>{off();remove?.();remove=undefined;};});
  });
  return()=>{if(disposed)return;disposed=true;void owned.dispose();};
 }};
}
