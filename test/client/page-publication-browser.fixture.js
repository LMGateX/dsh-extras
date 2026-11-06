import React from 'react';
import {createRoot} from 'react-dom/client';
import {Context} from '@deepseek-ai/cordis';
const ctx = new Context();
const root = createRoot(document.getElementById('root'));
const nativeListeners = new Set();
const pageListeners = new Set();
let nativeState = {status:'ready',writable:true,revision:7,value:{modules:{'compact-context':{enabled:true,compactTool:false,compactionReasoning:{enabled:false,rules:[]}},retry:{enabled:true}}},user:{}};
let pageState = nativeState;
window.nativeWrites = [];
function accept(ops) {
  const value = structuredClone(nativeState.value);
  for (const op of ops) {let node=value;for(const key of op.path.slice(0,-1))node=node[key]??={};const key=op.path.at(-1);if(op.op==='set')node[key]=structuredClone(op.value);else delete node[key];}
  nativeState={...nativeState,value,user:structuredClone(value),revision:nativeState.revision+1};
  for(const listener of nativeListeners)listener();
}
async function pageMutate(ops,revision) {
  window.nativeWrites.push({ops,revision});
  if(revision!==nativeState.revision)return false;
  if(window.nativeWrites.length===1)return new Promise(resolve=>{window.acknowledge=()=>{accept(ops);resolve(true);};});
  accept(ops);return true;
}
const form={getSnapshot:()=>nativeState,subscribe(listener){nativeListeners.add(listener);return()=>nativeListeners.delete(listener);},mutate(){throw new Error('fallback-root writes are forbidden');}};
const provide=(name,value)=>{ctx.provide(name);ctx.set(name,value);};
provide('configForms',{get:()=>form,whileServed:(_rows,fn)=>fn()});
let View;
const readPage=()=>pageState;
const subscribePage=listener=>{pageListeners.add(listener);return()=>pageListeners.delete(listener);};
function Page(){const state=React.useSyncExternalStore(subscribePage,readPage);return View?React.createElement(View,{view:'page',form:{state,mutate:pageMutate},configForm:form}):null;}
provide('slots',{inject:(_name,fn)=>fn(),register(options,view){if(options.name==='plugins.bundle.config'){View=view;root.render(React.createElement(Page));}return()=>{if(View===view){View=undefined;root.render(null);}};}});
window.accepted=()=>nativeState;
window.pageRevision=()=>pageState.revision;
window.publishPage=()=>{pageState=nativeState;for(const listener of pageListeners)listener();};
window.__ModuleLoader__={load(entry){window.fiber=ctx.plugin(entry.factory(name=>{if(name!=='react')throw new Error(name);return React;}));}};
window.unload=async()=>{root.unmount();await window.fiber.dispose();await ctx.fiber.dispose();window.remainingListeners=nativeListeners.size+pageListeners.size;};
