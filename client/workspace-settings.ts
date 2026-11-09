import {useSettingsText, type SettingsLocale} from './settings-ui.ts';

export interface WorkspaceCatalog {
  getSnapshot(): {readonly status: 'loading'|'ready'|'stale'|'unavailable'; readonly items: readonly {readonly workspaceId:string; readonly title:string}[]};
  subscribe(listener:()=>void):()=>void;
}
type CatalogSnapshot = ReturnType<WorkspaceCatalog['getSnapshot']>;
const unavailable:CatalogSnapshot = {status:'unavailable',items:[]};
const noSubscribe = (_listener:()=>void)=>()=>{};
const readUnavailable = ()=>unavailable;
const validId = (id:unknown):id is string => typeof id==='string' && id.length>0 && id.length<=200 && !/[\u0000-\u001f\u007f-\u009f]/u.test(id);

/** A read-only projection of the native-owned stream; never starts or disposes that stream. */
export function createWorkspaceCatalog(ctx:any):WorkspaceCatalog {
  let snapshot:CatalogSnapshot={status:'loading',items:[]};
  let arrived=false;
  let generation=0;
  const listeners=new Set<()=>void>();
  const publish=(status:CatalogSnapshot['status'],items=snapshot.items)=>{
    if(status===snapshot.status && items.length===snapshot.items.length && items.every((item,index)=>item.workspaceId===snapshot.items[index]?.workspaceId && item.title===snapshot.items[index]?.title))return;
    snapshot={status,items};
    for(const listener of listeners){try{listener();}catch{/* One observer cannot break native delivery. */}}
  };
  const lost=()=>publish(arrived?'stale':'unavailable');
  try {
    ctx.inject(['workspaces'],(scope:any)=>{
      const token=++generation;
      let active=true;
      let stop=()=>{};
      const sync=()=>{
        if(!active || token!==generation)return;
        try {
          const source=scope.get('workspaces')?.list;
          const value=source?.getSnapshot();
          if(!value || !Array.isArray(value.items) || !['pending','ready'].includes(value.phase) || !['idle','loading','error'].includes(value.state))throw new Error('Unavailable workspace snapshot');
          const seen=new Set<string>();
          const items=value.items.map((row:any)=>{
            if(!validId(row?.workspaceId) || typeof row.title!=='string' || seen.has(row.workspaceId))throw new Error('Invalid workspace row');
            seen.add(row.workspaceId);
            return {workspaceId:row.workspaceId,title:row.title};
          });
          if(value.phase==='pending'){
            if(value.state==='error' || value.error!==null)lost();
            else publish(arrived?'stale':'loading');
            return;
          }
          arrived=true;
          publish(value.state==='idle' && value.error===null?'ready':'stale',items);
        }catch{lost();}
      };
      try {
        const source=scope.get('workspaces')?.list;
        if(typeof source?.getSnapshot!=='function' || typeof source?.subscribe!=='function')throw new Error('Workspace source unavailable');
        const unsubscribe=source.subscribe(()=>sync());
        if(typeof unsubscribe!=='function')throw new Error('Workspace subscription unavailable');
        stop=()=>unsubscribe();
        sync();
      }catch{lost();}
      return ()=>{if(!active)return;active=false;try{stop();}finally{if(token===generation){generation++;lost();}}};
    });
  }catch{lost();}
  return {getSnapshot:()=>snapshot,subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};}};
}

interface ScopeProps {
  catalog?:WorkspaceCatalog;
  workspaceId?:string;
  configuredIds?:readonly string[];
  locked?:boolean;
  onChange(id:string|undefined):void;
  label?:string;
  manualLabel?:string;
}
/** Scope navigation only. Policy editors own validation, drafts, inheritance and saving. */
export function createWorkspaceScopeView(React:any,locale?:SettingsLocale) {
  const h=React.createElement;
  return function WorkspaceScope({catalog,workspaceId,configuredIds=[],locked=false,onChange,label,manualLabel}:ScopeProps) {
    const t=useSettingsText(React,locale);
    const state:CatalogSnapshot=React.useSyncExternalStore(catalog?.subscribe??noSubscribe,catalog?.getSnapshot??readUnavailable,catalog?.getSnapshot??readUnavailable);
    // Manual mode survives discovery/configured-ID changes while an ID is being typed.
    const [manual,setManual]=React.useState(workspaceId==='');
    const [manualValue,setManualValue]=React.useState(workspaceId??'');
    const entries=new Map<string,{title?:string;saved:boolean}>();
    for(const item of state.items)entries.set(item.workspaceId,{title:item.title,saved:false});
    for(const id of configuredIds)if(typeof id==='string' && id.length)entries.set(id,{...entries.get(id),saved:true});
    if(workspaceId!==undefined && workspaceId.length && !entries.has(workspaceId))entries.set(workspaceId,{saved:false});
    const options=new Map<string,string>();
    for(const id of entries.keys()){
      // JSON escapes malformed Unicode too, keeping arbitrary exact IDs selectable.
      let encoded:string;try{encoded=encodeURIComponent(id);}catch{encoded=encodeURIComponent(JSON.stringify(id));}
      let key='native:'+encoded;
      while(options.has(key))key='native:'+key;
      options.set(key,id);
    }
    const selected=manual || workspaceId===''?'workspace':workspaceId===undefined?'global':[...options].find(([,id])=>id===workspaceId)?.[0]??'workspace';
    const scopeLabel=label??t('Scope','范围');
    const inputLabel=manualLabel??t('Native workspace ID','原生工作区 ID');
    const notices={
      loading:t('Loading native workspaces. Exact-ID entry remains available.','正在加载原生工作区；仍可输入精确 ID。'),
      stale:t('Workspace discovery is reconnecting or unavailable. Listed names are last known; saved overrides are preserved.','工作区发现正在重连或不可用。所列名称为上次已知值；已保存覆盖仍被保留。'),
      unavailable:t('Native workspace discovery unavailable. Saved overrides and exact-ID entry remain available.','原生工作区发现不可用；仍可选择已保存覆盖或输入精确 ID。'),
      ready:'',
    };
    return h('div',{'data-workspace-scope':'',style:{display:'grid',gap:'8px',minWidth:0}},
      h('label',null,scopeLabel,h('select',{'aria-label':scopeLabel,value:selected,disabled:locked,onChange:(event:any)=>{
        if(locked)return;
        const value=event.target.value;
        if(value==='global'){if(workspaceId!==undefined)setManualValue(workspaceId);setManual(false);onChange(undefined);}
        else if(value==='workspace'){setManual(true);if(workspaceId===undefined)onChange(manualValue);}
        else if(options.has(value)){const id=options.get(value)!;setManualValue(id);setManual(false);onChange(id);}
      }},
      h('option',{value:'global'},t('Global defaults','全局默认值')),
      ...[...options].map(([key,id])=>{
        const item=entries.get(id)!;
        const name=item.title??(item.saved?t('Saved override','已保存覆盖'):t('Selected workspace','所选工作区'));
        const suffix=item.title!==undefined?(state.status==='ready'?'':t(' — last known',' — 上次已知')):state.status==='ready'?t(' — not registered',' — 未注册'):t(' — registration unavailable',' — 注册状态不可用');
        return h('option',{key,value:key},name+' ('+id+')'+suffix);
      }),
      h('option',{value:'workspace'},t('Enter workspace ID (advanced)','输入工作区 ID（高级）')))),
      selected==='workspace'&&h('label',null,inputLabel,h('input',{type:'text','aria-label':inputLabel,value:workspaceId??'',disabled:locked,maxLength:200,spellCheck:false,onChange:(event:any)=>{if(!locked){setManualValue(event.target.value);onChange(event.target.value);}}})),
      notices[state.status]&&h('p',{role:'status'},notices[state.status]),
      locked&&h('small',null,t('Save or discard this draft before changing its scope.','请先保存或丢弃草稿，再更改范围。')));
  };
}
