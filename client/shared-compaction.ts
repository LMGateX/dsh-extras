/** One browser-side accepted authority, adapted to the existing public ConfigForm interface. */
import type {ConfigForm,ConfigFormSnapshot,PathOperation} from './forms.ts';
import {resolveCompactionReasoning,validateCompactionReasoning,type CompactionReasoningPolicy} from '../src/modules/compact-context/reasoning-policy.ts';

interface Document {revision:number;defaults:CompactionReasoningPolicy;workspaceOverrides:Record<string,CompactionReasoningPolicy>}
function acceptDocument(raw:unknown):Document {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid shared policy response');
 const value=raw as Document;
 if(!Number.isSafeInteger(value.revision)||value.revision<0)throw new Error('Invalid shared policy revision');
 validateCompactionReasoning(value.defaults);
 if(!value.workspaceOverrides||typeof value.workspaceOverrides!=='object'||Array.isArray(value.workspaceOverrides)||Object.keys(value.workspaceOverrides).length>1000)throw new Error('Invalid workspace policies');
 for(const [id,policy]of Object.entries(value.workspaceOverrides)){if(!id||id.length>200||/[\u0000-\u001f\u007f-\u009f]/u.test(id)||['__proto__','prototype','constructor'].includes(id))throw new Error('Invalid workspace identity');validateCompactionReasoning(policy);}
 return structuredClone({revision:value.revision,defaults:value.defaults,workspaceOverrides:value.workspaceOverrides});
}
export function createSharedCompactionSource(fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){
 let document:Document|undefined;
 let status:ConfigFormSnapshot['status']='loading';
 let busy=false;
 let rowId:string|undefined;
 let version=0;
 let readGeneration=0;
 let lifetime=0;
 let controller:AbortController|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const leases=new Map<string,number>();
 const listeners=new Set<()=>void>();
 const forms=new Map<string,ConfigForm<CompactionReasoningPolicy>>();
 const publish=()=>{version++;for(const listener of listeners)listener();};
 const path=()=>'/extras/'+encodeURIComponent(rowId!)+ '/shared-compaction';
 async function refresh(id?:string):Promise<void>{
  if(id)rowId=id; if(!rowId)return;
  const token=++readGeneration;controller?.abort();const pending=new AbortController();controller=pending;
  try{const response=await fetcher(path(),{credentials:'same-origin',cache:'no-store',signal:pending.signal});if(!response.ok)throw new Error('Shared policy unavailable');
   const next=acceptDocument(await response.json());if(token!==readGeneration||pending.signal.aborted)return;if(!document||next.revision>=document.revision)document=next;status='ready';publish();
  }catch{if(token===readGeneration&&!pending.signal.aborted){status='unavailable';publish();}}
  finally{if(controller===pending)controller=undefined;}
 }
 function start(id:string):()=>void{
  if(!id)throw new Error('Distribution identity required');
  const first=leases.size===0;leases.set(id,(leases.get(id)??0)+1);rowId=leases.keys().next().value;
  if(first){const token=++lifetime;const pump=async()=>{await refresh();if(leases.size&&token===lifetime)timer=setTimeout(()=>{void pump();},1500);};void pump();}
  let stopped=false;return()=>{if(stopped)return;stopped=true;const count=(leases.get(id)??1)-1;if(count)leases.set(id,count);else leases.delete(id);
   if(leases.size){rowId=leases.keys().next().value;return;}
   if(timer!==undefined)clearTimeout(timer);timer=undefined;lifetime++;readGeneration++;controller?.abort();controller=undefined;status='unavailable';publish();
  };
 }
 function form(workspaceId?:string):ConfigForm<CompactionReasoningPolicy>{
  if(workspaceId!==undefined&&(!workspaceId||workspaceId.length>200||/[\u0000-\u001f\u007f-\u009f]/u.test(workspaceId)||['__proto__','prototype','constructor'].includes(workspaceId)))throw new Error('Invalid workspace identity');
  const key=workspaceId??'';const existing=forms.get(key);if(existing)return existing;
  let lastVersion=-1;let snapshot:ConfigFormSnapshot<CompactionReasoningPolicy>;
  const result:ConfigForm<CompactionReasoningPolicy>={
   getSnapshot(){if(lastVersion!==version){lastVersion=version;const policy=document?(workspaceId?document.workspaceOverrides[workspaceId]??document.defaults:document.defaults):resolveCompactionReasoning();
    snapshot={status,writable:status==='ready'&&!busy,revision:document?.revision,value:structuredClone(policy),base:structuredClone(workspaceId?document?.defaults??resolveCompactionReasoning():resolveCompactionReasoning()),user:workspaceId?structuredClone(document?.workspaceOverrides[workspaceId]):structuredClone(document?.defaults)};}return snapshot;},
   subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
   async mutate(ops:readonly PathOperation[],expectedRevision?:number){
    if(status!=='ready'||busy||!document||!rowId||expectedRevision!==document.revision||ops.length!==1||ops[0]!.path.length!==0)return false;
    const op=ops[0]!;const next=structuredClone(document);
    if(op.op==='set'){validateCompactionReasoning(op.value);if(workspaceId)next.workspaceOverrides[workspaceId]=structuredClone(op.value as CompactionReasoningPolicy);else next.defaults=structuredClone(op.value as CompactionReasoningPolicy);}
    else if(workspaceId)delete next.workspaceOverrides[workspaceId];else next.defaults=resolveCompactionReasoning();
    busy=true;publish();
    try{const response=await fetcher(path(),{method:'PUT',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:document.revision,defaults:next.defaults,workspaceOverrides:next.workspaceOverrides})});
     if(response.status===409){const body=await response.json() as {current?:unknown};if(body.current){const current=acceptDocument(body.current);if(current.revision>=document.revision)document=current;}return false;}
     if(!response.ok)throw new Error('Could not save shared compaction policy');
     const accepted=acceptDocument(await response.json());if(accepted.revision<=next.revision)throw new Error('Shared policy write was not accepted');document=accepted;status='ready';return true;
    }finally{busy=false;publish();}
   },
  };forms.set(key,result);return result;
 }
 return {refresh,form,start};
}
export type SharedCompactionSource=ReturnType<typeof createSharedCompactionSource>;
const BROWSER_AUTHORITY=Symbol.for('dsh-extras.shared-compaction.browser.v1');
/** Bundled copies share an accepted projection; writes always use the host CAS authority. */
export function browserSharedCompactionSource():SharedCompactionSource{
 const realm=globalThis as typeof globalThis & {[BROWSER_AUTHORITY]?:SharedCompactionSource};
 return realm[BROWSER_AUTHORITY]??=createSharedCompactionSource();
}
