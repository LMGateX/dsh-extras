/** Session-scoped optional native recovery UI; no prompt/message/provider APIs are used. */
import {acceptRecoveryView,type RecoveryCommand,type RecoveryReceipt,type RecoveryView} from '../src/modules/retry/recovery.ts';
import {useSettingsText} from './settings-ui.ts';
import {ownScope} from './scope.ts';
export interface RequestRecoveryMount {
 rowId:string;enabled():boolean;subscribe(listener:()=>void):()=>void;
}
export interface RecoverySource {read(sessionId:string,signal?:AbortSignal):Promise<RecoveryView>;retry(command:RecoveryCommand):Promise<RecoveryReceipt>;}
const rejected=(reason:string):RecoveryReceipt=>({status:'rejected',reason});
const receiptId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=512&&[...v].every(c=>c.charCodeAt(0)>32&&c.charCodeAt(0)!==127);
const known=new Set(['agent-detached','agent-busy','exact-snapshot-unavailable','checkpoint-stale','foreign-session','invalid-operation-id','recovery-policy-rejected','recovery-admission-failed','module-disabled','native-recovery-unavailable','native-recovery-incompatible','native-recovery-rejected']);
/** Same-origin cookie transport. Native owns checkpoint expiry, admission and idempotency. */
export function createRequestRecoverySource(rowId:string,fetcher:typeof fetch=fetch):RecoverySource {
 const path='/extras/'+encodeURIComponent(rowId)+'/request-recovery';
 return {
  async read(sessionId,signal){const r=await fetcher(path+'?sessionId='+encodeURIComponent(sessionId),{credentials:'same-origin',cache:'no-store',signal});if(!r.ok)throw Error('recovery-transport-unavailable');return acceptRecoveryView(await r.json(),sessionId);},
  async retry(command){const r=await fetcher(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});const value=await r.json();
   if(r.ok&&value?.status==='accepted'&&receiptId(value.operationId)&&value.checkpointId===command.checkpointId&&receiptId(value.executionId))return {status:'accepted',checkpointId:value.checkpointId,operationId:value.operationId,executionId:value.executionId};
   if(r.status===409&&value?.status==='rejected')return rejected(known.has(value.reason)?value.reason:'native-recovery-rejected');
   throw Error('recovery-transport-unavailable');
  },
 };
}
interface Attempt {key:string;operationId:string;pending?:Promise<RecoveryReceipt>;receipt?:RecoveryReceipt;}
/** A turn error also represents preparation/tool/hook failures. Only a durable
 * model finish(error) immediately closed by this exact terminal step proves origin.
 * Outline remains the head proof; this contiguous public window proves origin only. */
function terminalModelFailure(window:any,turn:any):boolean {
 const entries=window?.entries;if(!Array.isArray(entries))return false;
 const terminalSeq=turn?.end?.seq;
 const index=entries.findLastIndex((entry:any)=>entry.type==='event'&&entry.event?.type==='turn/end'&&entry.event.seq===terminalSeq&&entry.event.data?.turn===turn?.turn);
 if(index<0)return false;
 let seq=terminalSeq-1;let step:number|undefined;let failure:any;
 for(let i=index-1;i>=0;i--){
  const entry=entries[i];const event=entry?.event;
  if(entry?.type!=='event'||event?.seq!==seq--||event.data?.turn!==turn?.turn)return false;
  if(event.type==='step/end'&&step===undefined&&Number.isSafeInteger(event.data.step)){step=event.data.step;continue;}
  if(event.type==='request/failure'&&step!==undefined&&failure===undefined&&event.data.step===step&&event.data.disposition==='budget-exhausted'&&Number.isSafeInteger(event.data.attemptSeq)){failure=event.data;continue;}
  if(event.type!=='assistant/attempt'||step===undefined||event.data.step!==step||(failure&&failure.attemptSeq!==event.seq))return false;
  const stream=event.data.stream;if(!Array.isArray(stream))return false;
  const finish=stream.findLast((record:any)=>record.type==='chunk'&&record.chunk?.type==='finish')?.chunk;
  return finish?.reason?.kind==='error'&&typeof finish.reason.failure?.code==='string'&&typeof finish.reason.failure?.message==='string';
 }
 return false;
}
// Scoped to this optional tail; no conversation or host styles are overwritten.
const RECOVERY_CSS=`
[data-request-recovery] { --recovery-bg:#f7f8fa; --recovery-text:#20242b; --recovery-muted:#535c6b; --recovery-border:#d6dce5; box-sizing:border-box; display:grid; gap:12px; width:100%; min-width:0; margin:12px 0; padding:16px; border:1px solid var(--dsw-alias-border-l1,var(--recovery-border)); border-radius:12px; background:var(--dsw-alias-bg-layer-2,var(--recovery-bg)); color:var(--dsw-alias-label-primary,var(--recovery-text)); font-size:13px; line-height:1.6; overflow-wrap:anywhere; }
[data-request-recovery] .recovery-heading { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
[data-request-recovery] h3 { margin:0; font-size:14px; font-weight:600; }
[data-request-recovery] .recovery-indicator { display:grid; place-items:center; width:22px; height:22px; border:1px solid currentColor; border-radius:50%; color:var(--dsw-alias-state-error-primary,#b42318); font-weight:700; flex-shrink:0; }
[data-request-recovery] .recovery-state { margin-inline-start:auto; padding:2px 8px; border:1px solid var(--dsw-alias-border-l1,var(--recovery-border)); border-radius:999px; font-size:12px; color:var(--dsw-alias-label-secondary,var(--recovery-muted)); }
[data-request-recovery] p { margin:0; color:var(--dsw-alias-label-secondary,var(--recovery-muted)); }
[data-request-recovery] [role=alert] { color:var(--dsw-alias-state-error-primary,#b42318); }
[data-request-recovery] .recovery-actions { display:flex; flex-wrap:wrap; gap:8px; padding-top:12px; border-top:1px solid var(--dsw-alias-border-l1,var(--recovery-border)); }
[data-request-recovery] button { box-sizing:border-box; max-width:100%; min-height:36px; padding:7px 12px; border:1px solid var(--dsw-alias-border-l2,var(--recovery-border)); border-radius:8px; background:var(--dsw-alias-bg-layer-3,var(--recovery-bg)); color:inherit; font:inherit; line-height:1.5; white-space:normal; overflow-wrap:anywhere; cursor:pointer; }
[data-request-recovery] button.recovery-primary { background:var(--dsw-alias-button-primary-fill,#3658c5); border-color:transparent; color:var(--dsw-alias-label-primary-foreground,#fff); font-weight:600; }
[data-request-recovery] button:hover:not(:disabled) { filter:brightness(.95); }
[data-request-recovery] button:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary,#526de1); outline-offset:3px; }
[data-request-recovery] button:disabled { opacity:.55; cursor:not-allowed; }
@media (prefers-color-scheme:dark) { [data-request-recovery] { --recovery-bg:#252931; --recovery-text:#edf0f7; --recovery-muted:#b9c1d0; --recovery-border:#48505e; } [data-request-recovery] .recovery-indicator,[data-request-recovery] [role=alert] { color:var(--dsw-alias-state-error-primary,#ffb4ab); } }
@media (max-width:480px) { [data-request-recovery] { padding:12px; } [data-request-recovery] .recovery-state { margin-inline-start:0; } }
`;
/** Parent selects this factory only in retry-bearing bundles, then owns mount disposal. */
export function createRequestRecoveryAdapter(React:any,environment?:{fetch?:typeof fetch;operationId?:()=>string}) {
 const h=React.createElement;const attempts=new Map<string,Attempt>();
 return {mount(ctx:any,options:RequestRecoveryMount):()=>void {
  const owned=ownScope(ctx);let disposed=false;
  const source=createRequestRecoverySource(options.rowId,environment?.fetch);
  owned.ctx.inject(['slots','sessions'],(scope:any)=>{
   const locale=scope.get('locale');
   function View({sessionId,session,eventSource,turn}:{sessionId:string;session:any;eventSource:any;turn:any}) {
    const t=useSettingsText(React,locale);
    const callbacks=React.useMemo(()=>({subscribe:(fn:()=>void)=>session?.subscribe(fn)??(()=>{}),read:()=>session?.getSnapshot()}),[session]);
    const sessionState=React.useSyncExternalStore(callbacks.subscribe,callbacks.read,callbacks.read);
    const eventCallbacks=React.useMemo(()=>({subscribe:(fn:()=>void)=>eventSource?.subscribe(fn)??(()=>{}),read:()=>eventSource?.getSnapshot()}),[eventSource]);
    const eventWindow=React.useSyncExternalStore(eventCallbacks.subscribe,eventCallbacks.read,eventCallbacks.read);
    // The host projection covers every started turn, including those outside the
    // paged event window. Missing head proof is not a current failed request.
    const outlineSource=React.useMemo(()=>session?.projections?.faceOf('turnOutline'),[session]);
    const outlineCallbacks=React.useMemo(()=>({subscribe:(fn:()=>void)=>outlineSource?.subscribe(fn)??(()=>{}),read:()=>outlineSource?.getSnapshot()}),[outlineSource]);
    const outline=React.useSyncExternalStore(outlineCallbacks.subscribe,outlineCallbacks.read,outlineCallbacks.read);
    const [view,setView]=React.useState(undefined as RecoveryView|undefined);const [notice,setNotice]=React.useState('');const [busy,setBusy]=React.useState(false);const [refresh,setRefresh]=React.useState(0);
    const live=React.useRef(false);const pending=React.useRef(false);const generation=React.useRef(0);
    const terminalSeq=turn?.end?.seq;
    const ownsLatestError=(head:any)=>Array.isArray(head)&&head.length>0&&head.at(-1)?.turn===turn?.turn&&head.at(-1)?.seq===turn?.start?.seq&&turn?.status==='closed'&&turn?.end?.type==='turn/end'&&turn?.end?.data?.turn===turn?.turn&&turn?.end?.data?.reason?.kind==='error'&&Number.isSafeInteger(terminalSeq);
    const closed=ownsLatestError(outline)&&terminalModelFailure(eventWindow,turn)&&sessionState?.running===false&&sessionState?.openState==='open'&&!sessionState?.removed;
    React.useEffect(()=>{live.current=true;return()=>{live.current=false;generation.current++;};},[]);
    React.useEffect(()=>{
     const token=++generation.current;setView(undefined);
     if(!closed||!session||sessionState?.running||!options.enabled()||disposed)return;
     const abort=new AbortController();
     source.read(sessionId,abort.signal).then(v=>{if(live.current&&token===generation.current&&!disposed&&options.enabled())setView(v);},()=>{if(live.current&&token===generation.current&&!abort.signal.aborted)setNotice('recovery-transport-unavailable');});
     return()=>abort.abort();
    },[sessionId,session,sessionState,eventWindow,turn?.turn,terminalSeq,closed,refresh]);
    const cp=view?.status==='available'?view.checkpoint:undefined;
    const matches=!!cp&&cp.sessionId===sessionId&&cp.turn===turn?.turn&&cp.terminalSeq===terminalSeq;
    const key=cp?cp.checkpointId+':'+cp.revision:'';
    const previous=attempts.get(sessionId);const accepted=previous?.key===key&&previous.receipt?.status==='accepted';
    const denied=previous?.key===key&&previous.receipt?.status==='rejected';
    async function retry(){
     if(pending.current||!matches||!cp||accepted||denied||disposed||!options.enabled()||!ownsLatestError(outlineSource?.getSnapshot())||!terminalModelFailure(eventSource?.getSnapshot(),turn)||session?.getSnapshot()?.running!==false||session?.getSnapshot()?.openState!=='open'||session?.getSnapshot()?.removed)return;
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
    // Stock rc.3 has native normal-followup Continue generating, not this optional
    // checkpoint protocol. Keep its control untouched and avoid per-turn absence noise.
    // Incompatible protocols and actual action/transport diagnostics remain visible.
    if(view?.status==='unavailable'&&view.reason==='native-recovery-unavailable'&&!notice)return null;
    // A historical tail must not acquire a button for another terminal attempt.
    if(cp&&!matches)return null;
    const reason=notice==='accepted'?t('Recovery accepted; native execution started (not completed).','恢复已受理；原生执行已开始（尚未完成）。'):notice==='recovery-transport-unavailable'?t('Recovery transport unavailable; retrying uses the same operation identity.','恢复连接不可用；再次点击将使用相同操作标识。'):notice?t('Recovery rejected: ','恢复被拒绝：')+notice:view?.status==='unavailable'?t('Recovery unavailable: ','恢复不可用：')+(view.reason??'native-recovery-unavailable'):'';
    if(!matches&&!reason)return null;
    const heading=t('Failed request recovery','失败请求恢复');
    const state=busy?t('Retrying…','正在重试…'):notice==='accepted'?t('Accepted','已受理'):notice==='recovery-transport-unavailable'?t('Connection issue','连接异常'):notice?t('Rejected','已拒绝'):matches?t('Ready to retry','可以重试'):t('Unavailable','不可用');
    return h('section',{'data-request-recovery':true,role:'region','aria-label':heading,'aria-busy':busy},
     h('style',null,RECOVERY_CSS),
     h('div',{className:'recovery-heading'},h('span',{className:'recovery-indicator','aria-hidden':true},'!'),h('h3',null,heading),h('span',{className:'recovery-state'},state)),
     h('p',null,t('The latest request ended in an error. Recovery does not send a new message or repeat completed tools.','最新请求因错误而终止。恢复不会发送新消息，也不会重复已完成的工具操作。')),
     reason?h('p',{role:notice&&notice!=='accepted'?'alert':'status'},reason):null,
     h('div',{className:'recovery-actions'},
      matches&&!accepted&&!denied?h('button',{type:'button',className:'recovery-primary',disabled:busy,onClick:()=>void retry()},busy?t('Retrying…','正在重试…'):t('Retry failed request','重试失败请求')):null,
      !busy?h('button',{type:'button',onClick:()=>{setNotice('');setRefresh((n:number)=>n+1);}},t('Refresh recovery state','刷新恢复状态')):null));
   }
   let remove:(()=>void)|undefined;
   const sync=()=>{
    if(!disposed&&options.enabled()&&!remove)remove=scope.slots.inject('conversation.chat.turnTail',()=>scope.slots.register({name:'conversation.chat.turnTail',id:options.rowId+'#request-recovery',inject:(sessionId:string)=>{const binding=scope.sessions.binding(sessionId);return{sessionId,session:binding?.session,eventSource:binding?.eventSource};}},View));
    else if((disposed||!options.enabled())&&remove){const off=remove;remove=undefined;off();}
   };
   scope.effect(()=>{const off=options.subscribe(sync);sync();return()=>{off();remove?.();remove=undefined;};});
  });
  return()=>{if(disposed)return;disposed=true;void owned.dispose();};
 }};
}
