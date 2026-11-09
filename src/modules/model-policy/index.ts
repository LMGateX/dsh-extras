import type {Context} from '@deepseek-ai/cordis';
import {resolveConfig,validateConfig,selectionFor,type ResolvedConfig} from './config.ts';
import {resolveSessionIdentity} from './workspace.ts';
import {participateCompaction,type SharedCompactionStatus} from '../../shared-compaction/index.ts';
import {mountSharedCompactionRoutes} from '../../shared-compaction/routes.ts';
export {Config,resolveConfig,validateConfig} from './config.ts';
export {resolveSessionWorkspace} from './workspace.ts';
export const name='extras-model-policy';
export const inject: string[]=[];
type Capability={phase:'disabled'|'active'|'unavailable';reason?:string};
type State={modelPolicy:Capability;compactionReasoning:SharedCompactionStatus};
const states=new WeakMap<object,State>();
export function runtimeStatus(ctx:Context):{capabilities:State} {const s=states.get(ctx.fiber);return {capabilities:s ? structuredClone(s) : {modelPolicy:{phase:'disabled'},compactionReasoning:{phase:'disabled'}}};}
/** Workspace defaults are applied only at awaited creation and accepted policy updates.
 * No request/pre-step interceptor: explicit later native selections remain authoritative.
 */
export async function apply(ctx:Context,rawConfig:Record<string,unknown>={}):Promise<void> {
 let accepted=resolveConfig(rawConfig);validateConfig(accepted);
 const state:State={modelPolicy:{phase:'disabled'},compactionReasoning:{phase:'disabled'}};states.set(ctx.fiber,state);
 const participation=(config:ResolvedConfig)=>({...config.compactionReasoning,enabled:config.enabled&&config.compactionReasoning.enabled});
 const compaction=participateCompaction(ctx,{module:'model-policy',policy:participation(accepted)},value=>{state.compactionReasoning=value;});
 let live=true; let generation=0;
 const c=ctx as any;
 const applyAgent=async(agent:any,config:ResolvedConfig,token:number,signal?:AbortSignal,previous?:ResolvedConfig)=>{
  if(!config.enabled) return;
  const before=JSON.stringify(agent.model?.current());
  try {
   const llm=agent.ctx.get('llm');
   if(!agent.model?.select || !llm?.resolveCallConfig) throw new Error('native model selection unavailable');
   const identity=await resolveSessionIdentity(c,agent.id,signal);
   if(!identity) throw new Error('native workspace provenance unavailable');
   const next=selectionFor(config,identity.workspaceId,identity.descendant);
   if(!next || previous?.enabled && JSON.stringify(selectionFor(previous,identity.workspaceId,identity.descendant))===JSON.stringify(next)) return;
   // The native query validates exact provider/model/effort. Do not persist an adapter default.
   await llm.resolveCallConfig(next,signal);
   if(!live || token!==generation || signal?.aborted || c.get('agents')?.get(agent.id)!==agent || JSON.stringify(agent.model.current())!==before) return;
   agent.model.select(next);
  } catch {
   if(live && token===generation) state.modelPolicy={phase:'unavailable',reason:'native workspace provenance, route or exact effort unavailable'};
  }
 };
 const refresh=async(previous?:ResolvedConfig)=>{
  const token=++generation; const config=accepted;
  state.modelPolicy=!config.enabled ? {phase:'disabled'} : c.get('agents') && c.get('workspaceRegistry') && c.get('llm') ? {phase:'active'} : {phase:'unavailable',reason:'native agent, workspace or LLM service unavailable'};
  if(config.enabled) await Promise.all((c.get('agents')?.list() ?? []).map((agent:any)=>applyAgent(agent,config,token,undefined,previous)));
 };
 c.on('agent/created',async({agent,signal,source}:any)=>{
  // Default mode never guesses who authored an existing durable native choice.
  // Fresh forks use startup, so their inherited seed still receives child defaults.
  if(source==='resume' && (agent.session.requestHeader() || agent.session.snapshotEvents().some((event:any)=>event.type==='model/selection'))) return undefined;
  await applyAgent(agent,accepted,generation,signal);return undefined;
 });
 c.on('loader/volatile-update',async()=>{
  let next:ResolvedConfig;try{next=resolveConfig(rawConfig);validateConfig(next);}catch{return;}
  const previous=accepted;accepted=next;compaction.update(participation(next));await refresh(previous);
 });
 ctx.effect(()=>()=>{live=false;generation++;compaction.dispose();states.delete(ctx.fiber);});
 await compaction.ready;
 await refresh();
}
/** Root mounts authenticated shared settings even while model selection remains disabled. */
export function mountSettings(ctx:Context,distribution:string):void {
 mountSharedCompactionRoutes(ctx,'/extras/'+encodeURIComponent(distribution)+'/shared-compaction');
}

