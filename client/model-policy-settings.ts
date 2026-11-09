import type {ConfigForm,ConfigFormSnapshot,PathOperation} from './forms.ts';
import {useSettingsText,type SettingsLocale} from './settings-ui.ts';
import type {ReasoningCatalogSource} from './reasoning-settings.ts';
import {createWorkspaceCatalog,createWorkspaceScopeView,type WorkspaceCatalog} from './workspace-settings.ts';
import {resolveConfig,validateConfig,type ModelSelection} from '../src/modules/model-policy/policy.ts';
type Role='root'|'descendants';
/** Undefined is reserved for explicit global scope; invalid workspace strings never mean global. */
const validWorkspaceId=(value:string)=>value.length>0&&value.length<=200&&value.trim().length>0&&!/[\u0000-\u001f\u007f-\u009f]/u.test(value);
/** Drafts live outside collapsible layout and always retain their captured native revision. */
export function createModelPolicyEditor(form:ConfigForm) {
 const seed=(s:ConfigFormSnapshot)=>({value:resolveConfig((s.value??{}) as any),revision:s.revision,status:s.status,writable:s.writable,dirty:false,saving:false,conflict:false,error:'',resetRoles:[] as Role[],draftScope:undefined as string|null|undefined});
 let state=seed(form.getSnapshot());let live=false;let generation=0;const listeners=new Set<()=>void>();
 const publish=(s:typeof state)=>{state=s;for(const listener of listeners)listener();};
 const edit=(mutate:(value:typeof state.value)=>void,resetRoles=state.resetRoles,workspaceId?:string)=>{
  const target=workspaceId??null;
  if(state.saving||workspaceId!==undefined&&!validWorkspaceId(workspaceId)||state.dirty&&state.draftScope!==target)return;
  const value=structuredClone(state.value);mutate(value);publish({...state,value,dirty:true,error:'',resetRoles,draftScope:target});
 };
 const sync=()=>{if(!live)return;const s=form.getSnapshot();publish(state.dirty||state.saving?{...state,status:s.status,writable:s.writable,conflict:state.conflict||s.revision!==state.revision}:seed(s));};
 return {
  getSnapshot:()=>state,subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
  start(){live=true;const token=++generation;const stop=form.subscribe(sync);sync();return()=>{stop();if(token===generation){live=false;generation++;}};},
  setSelection(role:Role,selection:ModelSelection|null|undefined,workspaceId?:string){edit(value=>{
   if(workspaceId===undefined){value[role]=selection??null;return;}
   let item=value.workspaceOverrides.find(row=>row.workspaceId===workspaceId);
   if(selection===undefined){
    if(!item)return;delete item[role];
    if(item.root===undefined&&item.descendants===undefined)value.workspaceOverrides=value.workspaceOverrides.filter(row=>row!==item);
   }else{if(!item){item={workspaceId};value.workspaceOverrides.push(item);}item[role]=selection;}
  },workspaceId===undefined?state.resetRoles.filter(key=>key!==role):state.resetRoles,workspaceId);},
  resetScope(workspaceId?:string){edit(value=>{if(workspaceId!==undefined)value.workspaceOverrides=value.workspaceOverrides.filter(row=>row.workspaceId!==workspaceId);else {const base=resolveConfig((form.getSnapshot().base??{}) as any);value.root=base.root;value.descendants=base.descendants;}},workspaceId===undefined?['root','descendants']:state.resetRoles,workspaceId);},
  discard(){if(!state.saving)publish(seed(form.getSnapshot()));},
  async save():Promise<boolean>{
   const current=form.getSnapshot();
   if(!live||state.saving||!state.dirty||current.status!=='ready'||!current.writable||current.revision===undefined)return false;
   if(state.conflict||state.revision!==current.revision){publish({...state,conflict:true});return false;}
   try{validateConfig(state.value);}catch{publish({...state,error:'invalid'});return false;}
   const token=generation;const revision=state.revision;const value=structuredClone(state.value);
   const keys=state.draftScope===null?['root','descendants']:['workspaceOverrides'];
   const ops:PathOperation[]=keys.map(key=>state.resetRoles.includes(key as Role)?{op:'unset',path:[key]}:{op:'set',path:[key],value:(value as any)[key]});
   publish({...state,saving:true,error:''});
   try{const ok=await form.mutate(ops,revision);if(!live||token!==generation)return false;
    publish(ok ? {...seed(form.getSnapshot()),value,dirty:false} : {...state,saving:false,conflict:true,error:'refused'});return ok;
   }catch{if(live&&token===generation)publish({...state,saving:false,error:'connection'});return false;}
  },
 };
}

interface NativeGroup {id:string;models:{id:string;reasoning?:{efforts:{id:string;name:string}[]}}[]}
/** The form is the module section, not the entire distribution envelope. */
export function createModelPolicySettingsView(React:any,catalog?:ReasoningCatalogSource,locale?:SettingsLocale,workspaces?:WorkspaceCatalog) {
 const h=React.createElement;const ScopeView=createWorkspaceScopeView(React,locale);
 return function ModelPolicySettings({form,runtime,workspaceId:initialWorkspaceId}:{form:ConfigForm;runtime?:any;workspaceId?:string}) {
  const t=useSettingsText(React,locale);const [editor]=React.useState(()=>createModelPolicyEditor(form));
  React.useEffect(()=>editor.start(),[editor]);
  const draft=React.useSyncExternalStore(editor.subscribe,editor.getSnapshot,editor.getSnapshot);
  const [scope,setScope]=React.useState('global');const [workspaceId,setWorkspaceId]=React.useState(initialWorkspaceId??'');
  const [metadata,setMetadata]=React.useState({groups:[] as NativeGroup[],notice:'',busy:false});
  const [lifetime]=React.useState(()=>({live:true,request:0}));
  React.useEffect(()=>{lifetime.live=true;return()=>{lifetime.live=false;lifetime.request++;};},[lifetime]);
  const disabled=draft.status!=='ready'||!draft.writable||draft.revision===undefined||draft.saving;
  const activeScope=scope==='global'?undefined:workspaceId;
  const scopeValid=scope==='global'||validWorkspaceId(workspaceId);
  const scopeLocked=draft.dirty||draft.saving;
  async function refresh(){
   const token=++lifetime.request;setMetadata({...metadata,busy:true});
   let groups:NativeGroup[]=[];let notice='unavailable';
   try{const result=await catalog?.load() as any;if(result?.ok&&Array.isArray(result.value?.groups)){
    groups=result.value.groups.filter((g:any)=>typeof g?.id==='string'&&Array.isArray(g.models)).map((g:any)=>({id:g.id,models:g.models.filter((m:any)=>typeof m?.id==='string').map((m:any)=>({id:m.id,reasoning:{efforts:Array.isArray(m.reasoning?.efforts)?m.reasoning.efforts.filter((e:any)=>typeof e?.id==='string'&&typeof e.name==='string'):[]}}))}));notice=result.value.failures?.length?'partial':'loaded';
   }}catch{/* No raw provider errors or secrets in browser status. */}
   if(lifetime.live&&token===lifetime.request)setMetadata({groups,notice,busy:false});
  }
  const capability=runtime?.capabilities?.modelPolicy ?? runtime;
  const phase=capability?.phase??'unavailable';
  const phaseNames:Record<string,string>={active:t('Active','已激活'),disabled:t('Disabled','已关闭'),unavailable:t('Unavailable','不可用')};
  return h('fieldset',{'aria-label':t('Workspace model defaults','工作区模型默认值'),'data-extras-dirty':draft.dirty,className:'extras-group'},
   h('legend',null,t('Workspace model defaults','工作区模型默认值')),
   h('p',{role:'status'},(phaseNames[phase]??phaseNames.unavailable)+t('. Saved policy is not proof of active selection.','. 已保存策略不代表模型选择已生效。')),
   h('p',null,t('Defaults apply on creation/resume and accepted updates, not every step. Explicit later native model selections may override them. In-flight prepared steps remain unchanged.','默认值用于创建、恢复和已接受的配置更新，不强制逐步覆盖。后续显式原生模型选择仍可覆盖默认值，已准备的执行步骤不受影响。')),
   h(ScopeView,{catalog:workspaces,workspaceId:activeScope,configuredIds:draft.value.workspaceOverrides.map((row:{workspaceId:string})=>row.workspaceId),locked:scopeLocked,onChange:(id:string|undefined)=>{if(scopeLocked)return;setScope(id===undefined?'global':'workspace');if(id!==undefined)setWorkspaceId(id);}}),
   scope==='workspace'&&h('p',null,t('Use the stable native registry ID, never a directory path. Descendants follow their root workspace even in another worktree.','请使用原生注册表的稳定 ID，而非目录路径。后代即使进入其他 worktree 也跟随根代理的工作区。')),
   !scopeValid&&h('p',{role:'status'},t('Enter a valid native workspace ID before editing. Workspace scope never edits global defaults.','请输入有效的原生工作区 ID 后再编辑。工作区范围绝不会修改全局默认值。')),
   scopeLocked&&h('p',{role:'status'},t('Save or discard this draft before changing its scope or workspace ID.','请先保存或丢弃草稿，再更改范围或工作区 ID。')),
   ...(['root','descendants'] as Role[]).map(role=>{
    const row=scope==='workspace'?draft.value.workspaceOverrides.find((r:any)=>r.workspaceId===workspaceId):undefined;
    const selected=scope==='workspace'?row?.[role]:draft.value[role];
    const mode=selected===undefined?'global':selected===null?'native':'exact';
    const selection=selected??{provider:'',model:''};
    const effective=selected===undefined?draft.value[role]:selected;
    const source=scope==='global'?t('Global defaults','全局默认值'):selected===undefined?t('Inherited from global','继承全局'):t('Workspace override','工作区覆盖');
    const effectiveText=effective?effective.provider+' / '+effective.model+(effective.reasoningEffort?' · '+effective.reasoningEffort:''):t('Retain native selection','保留原生选择');
    const label=role==='root'?t('Root agent','根代理'):t('All descendants','所有后代');
    const efforts=metadata.groups.find((g:NativeGroup)=>g.id===selection.provider)?.models.find((m:any)=>m.id===selection.model)?.reasoning?.efforts??[];
    const update=(field:string,value:string)=>{if(scopeValid&&!disabled)editor.setSelection(role,{...selection,[field]:value||undefined},activeScope);};
    return h('fieldset',{key:role,'aria-label':label},h('legend',null,label),
     h('p',{'data-policy-source':scope==='global'?'global':selected===undefined?'inherited':'workspace'},h('span',{className:'extras-scope-badge'},source),t(' · Effective selection: ',' · 有效选择：')+effectiveText),
     h('label',null,t('Selection mode','选择模式'),h('select',{'aria-label':label+' '+t('mode','模式'),disabled:disabled||!scopeValid,value:mode,onChange:(e:any)=>{if(scopeValid&&!disabled)editor.setSelection(role,e.target.value==='native'?null:e.target.value==='global'?undefined:{provider:'',model:''},activeScope);}},
      scope==='workspace'&&h('option',{value:'global'},t('Inherit global default','继承全局默认值')),h('option',{value:'native'},t('Retain native selection','保留原生选择')),h('option',{value:'exact'},t('Exact native IDs','精确原生 ID')))),
     mode==='exact'&&h('div',null,...(['provider','model','reasoningEffort'] as const).map(field=>h('label',{key:field},field==='provider'?t('Provider ID','供应商 ID'):field==='model'?t('Model ID','模型 ID'):t('Reasoning effort ID (optional)','推理强度 ID（可选）'),h('input',{'aria-label':label+' '+field,value:selection[field]??'',disabled:disabled||!scopeValid,maxLength:200,spellCheck:false,onChange:(e:any)=>update(field,e.target.value)}))),
      h('label',null,t('Native effort choices for this exact model','此精确模型的原生推理强度选项'),h('select',{'aria-label':label+' '+t('native efforts','原生推理强度'),disabled:disabled||!scopeValid||!efforts.length,value:selection.reasoningEffort??'',onChange:(e:any)=>update('reasoningEffort',e.target.value)},h('option',{value:''},t('Native default (omit effort)','原生默认值（不指定强度）')),...efforts.map((e:any)=>h('option',{key:e.id,value:e.id},e.name+' ('+e.id+')')))),
      h('small',null,t('Only exact provider/model metadata is offered. Empty effort uses the native adapter default, never the previous model’s effort.','仅提供精确供应商和模型的原生元数据。强度留空使用原生适配器默认值，绝不沿用其他模型的强度。'))));
   }),
   h('button',{type:'button',disabled:metadata.busy,onClick:()=>{void refresh();}},t('Refresh native effort choices','刷新原生推理强度选项')),
   metadata.notice&&h('p',{role:'status'},metadata.notice==='loaded'?t('Native metadata loaded.','已加载原生元数据。'):metadata.notice==='partial'?t('Some native metadata is unavailable; exact IDs can still be entered.','部分原生元数据不可用；仍可输入精确 ID。'):t('Native metadata unavailable; enter exact IDs manually.','原生元数据不可用；请手动输入精确 ID。')),
   draft.conflict&&h('p',{role:'alert'},t('Configuration changed. Discard the draft to load the accepted revision; newer edits will not be overwritten.','配置已更改。请丢弃草稿加载已接受的版本；不会覆盖较新的编辑。')),
   draft.error&&h('p',{role:'alert'},draft.error==='invalid'?t('Invalid policy. Use unique workspace IDs and nonempty exact provider/model IDs (at most 200 control-free characters).','策略无效。工作区 ID 必须唯一，精确供应商和模型 ID 不得为空（最多 200 个无控制字符）。'):t('Save failed or was refused. Check the connection, then discard to reload accepted settings.','保存失败或被拒绝。请检查连接，再丢弃草稿重新加载已接受的设置。')),
   h('div',{className:'extras-actions'},
    h('button',{type:'button',disabled:disabled||!scopeValid||!draft.dirty||draft.conflict,onClick:()=>{if(scopeValid)void editor.save();}},t('Save model policy','保存模型策略')),
    h('button',{type:'button',disabled:draft.saving||!draft.dirty&&!draft.conflict,onClick:()=>editor.discard()},t('Discard model draft','丢弃模型草稿')),
    h('button',{type:'button',disabled:disabled||!scopeValid,onClick:()=>{if(scopeValid&&!disabled)editor.resetScope(activeScope);}},t('Reset scope to inherit (staged)','将范围重置为继承（暂存）'))));
 };
}
export function createModelPolicyAdapter(React:any) {return {createView(ctx:any){
 let remote:any;let locale:SettingsLocale|undefined;try{locale=ctx.get('locale');}catch{/* optional */}
 ctx.inject(['remote'],(scope:any)=>{remote=scope.get('remote');return()=>{remote=undefined;};});
 return createModelPolicySettingsView(React,{load:()=>remote?.session?.modelCatalog()},locale,createWorkspaceCatalog(ctx));
}};}
