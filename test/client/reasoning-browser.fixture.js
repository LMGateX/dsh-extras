import React from 'react';
import {createRoot} from 'react-dom/client';
import {Context} from '@deepseek-ai/cordis';
const ctx = new Context();
const root = createRoot(document.getElementById('root'));
const listeners = new Set();
let snapshot = {status:'ready',writable:true,revision:7,value: JSON.parse(localStorage.getItem('policy') || 'null') ?? {modules:{'compact-context':{enabled:true,compactTool:false,compactionReasoning:{enabled:false,rules:[]}},retry:{enabled:true}}}};
const notify = () => {for(const fn of listeners) fn();};
window.writes = [];
const form = {
  getSnapshot: () => snapshot,
  subscribe(fn) {listeners.add(fn); return () => listeners.delete(fn);},
  async mutate(ops,revision) {
    window.writes.push({ops,revision});
    if(!snapshot.writable || snapshot.status !== 'ready' || revision !== snapshot.revision) return false;
    const value = structuredClone(snapshot.value);
    for(const op of ops) {let target = value; for(const key of op.path.slice(0,-1)) target = target[key] ??= {}; const key = op.path.at(-1); if(op.op === 'unset') delete target[key]; else target[key] = structuredClone(op.value);}
    snapshot = {...snapshot,value,revision:revision+1}; localStorage.setItem('policy',JSON.stringify(value)); notify(); return true;
  },
};
const provide = (name,value) => {ctx.provide(name); ctx.set(name,value);};
provide('locale', { getLocale: () => ({ active: 'en' }), subscribe: () => () => {}, resolveText: text => typeof text === 'string' ? text : text.en });

window.catalogCalls = 0;
window.catalog = {ok:true,value:{groups:[{id:'Route/A',name:'Route display',models:[{id:'Model/Exact',name:'Model display',reasoning:{efforts:[{id:'Opaque:MAX/Case',name:'Advertised native effort'}]}}]}],failures:[]}};
if(!window.noRemote) provide('remote',{session:{async modelCatalog(){window.catalogCalls++; if(window.pendingCatalog) return new Promise(resolve => {window.resolveCatalog=resolve;}); return window.catalog;}}});
provide('configForms',{get:()=>form,whileServed:(_rows,fn)=>fn()});
let View;
function Page() {
  const state = React.useSyncExternalStore(form.subscribe,form.getSnapshot);
  return View ? React.createElement(View,{view:'page',form:{state,mutate:form.mutate}}) : null;
}
provide('slots',{
  inject:(_name,fn)=>fn(),
  register(options,view){if(options.name === 'plugins.bundle.config'){View=view; root.render(React.createElement(Page));} return () => {if(View===view){View=undefined; root.render(null);}};},
});
window.accepted = () => snapshot.value;
window.update = patch => {snapshot={...snapshot,...patch}; notify();};
window.siblingWrite = () => form.mutate([{op:'set',path:['modules','retry','enabled'],value:false}],snapshot.revision);
window.__ModuleLoader__={load(entry){window.fiber=ctx.plugin(entry.factory(name=>{if(name!=='react')throw new Error(name);return React;}));}};
window.unload = async () => {root.unmount();await window.fiber.dispose();await ctx.fiber.dispose();window.remainingListeners=listeners.size;};
