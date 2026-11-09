import React from 'react';
import {createRoot} from 'react-dom/client';
import {Context} from '@deepseek-ai/cordis';

// The only substitutes are the public host services. Settings always come from
// the actual client.js extracted from the disposable distribution tarball.
const ctx = new Context();
const root = createRoot(document.getElementById('root'));
const listeners = new Set();
const localeListeners = new Set();
let snapshot = {status:'ready', writable:true, revision:7, value:{
  modules:{
    'compact-context':{enabled:true, compactTool:false, guidanceText:'Original guidance', retryAttempts:2, retryDelayMs:1500, ptcTimeoutMs:30000, ptcModelTimeouts:{'original/model':5000}, compactionReasoning:{enabled:false,rules:[]}},
    retry:{enabled:true,errorCodes:['STREAM_ERROR'],providers:['Original/Route'],retryEmptyResponse:true},
    goalWait:{enabled:true,waitForJobs:true,waitForSubagents:true,maxHoldMs:12000},
    chime:{enabled:true,durationMs:0},
    'model-policy':{enabled:false,root:{provider:'Original/Provider',model:'Original/Model',reasoningEffort:'Opaque/Base'},descendants:null,workspaceOverrides:[],compactionReasoning:{enabled:false,rules:[]}},
  },
}};
window.writes = [];
const form = {
  getSnapshot() {return snapshot;},
  subscribe(fn) {listeners.add(fn); return () => listeners.delete(fn);},
  async mutate(ops, revision) {
    window.writes.push(structuredClone({ops,revision}));
    if (revision !== snapshot.revision || !snapshot.writable || snapshot.status !== 'ready') return false;
    const value = structuredClone(snapshot.value);
    for (const op of ops) {
      let target = value;
      for (const key of op.path.slice(0,-1)) target = target[key] ??= {};
      const key = op.path.at(-1);
      if (op.op === 'unset') delete target[key];
      else target[key] = structuredClone(op.value);
    }
    snapshot = {...snapshot,value,revision:revision+1};
    for (const fn of listeners) fn();
    return true;
  },
};
const provide = (name, value) => {ctx.provide(name); ctx.set(name,value);};
const requestedLocale = new URLSearchParams(location.search).get('locale');
let active = requestedLocale === 'en' ? 'en' : 'zh';
if (requestedLocale !== 'absent') provide('locale', {
  getLocale() {return {active};},
  subscribe(fn) {localeListeners.add(fn); return () => localeListeners.delete(fn);},
  resolveText(text) {return typeof text === 'string' ? text : text[active] ?? text.zh;},
});
window.setLocale = next => {active=next; for(const fn of localeListeners) fn();};
window.localeSubscriberCount = () => localeListeners.size;
window.accepted = () => structuredClone(snapshot);
window.setFormState = patch => {snapshot={...snapshot,...patch};for(const fn of listeners)fn();};
window.externalUpdate = () => form.mutate([{op:'set',path:['modules','retry','enabled'],value:false}], snapshot.revision);
provide('configForms',{get:()=>form,whileServed:(_rows,fn)=>fn()});
provide('remote',{session:{async modelCatalog(){return {ok:true,value:{groups:[],failures:[]}};}}});
let View;
window.viewRegistrations = 0;
function Page() {
  const state = React.useSyncExternalStore(form.subscribe,form.getSnapshot);
  return View ? React.createElement(View,{view:'page',form:{state,mutate:form.mutate}}) : null;
}
provide('slots',{
  inject:(_name,fn)=>fn(),
  register(options,view) {
    if (options.name !== 'plugins.bundle.config') return () => {};
    window.viewRegistrations++;
    View=view; root.render(React.createElement(Page));
    return () => {if(View===view){View=undefined;root.render(null);}};
  },
});
window.__ModuleLoader__={load(entry){
  window.fiber=ctx.plugin(entry.factory(name=>{if(name!=='react')throw new Error(name);return React;}));
}};
window.unload = async () => {
  root.unmount(); await window.fiber.dispose(); await ctx.fiber.dispose();
  return {form:listeners.size,locale:localeListeners.size};
};

// Native host tokens only: deliberately no stylesheet for inputs, cards,
// fieldsets or buttons. A UA-styled regression must remain observable.
const palettes = {
  light:{text:'#1f2937',muted:'#586374',bg:'#f8fafc',bg2:'#f1f5f9',bg3:'#ffffff',border:'#cbd5e1',border2:'#94a3b8',accent:'#2563eb',hover:'#dbeafe',foreground:'#ffffff'},
  dark:{text:'#e2e8f0',muted:'#94a3b8',bg:'#111827',bg2:'#1e293b',bg3:'#0f172a',border:'#475569',border2:'#64748b',accent:'#60a5fa',hover:'#172554',foreground:'#0f172a'},
};
window.setTheme = name => {
  const p = palettes[name];
  const tokens = {
    '--dsw-alias-label-primary':p.text,'--dsw-alias-label-secondary':p.muted,
    '--dsw-alias-bg-layer-1':p.bg,'--dsw-alias-bg-layer-2':p.bg2,'--dsw-alias-bg-layer-3':p.bg3,
    '--dsw-alias-border-l1':p.border,'--dsw-alias-border-l2':p.border2,
    '--dsw-alias-state-business-primary':p.accent,'--dsw-alias-brand-primary':p.accent,
    '--dsw-alias-button-primary-fill':p.accent,'--dsw-alias-interactive-bg-hover-accent':p.hover,
    '--dsw-alias-label-primary-foreground':p.foreground,'--dsw-radius-lg':'12px','--dsw-radius-md':'8px',
    '--dsw-alias-state-error-primary':'#dc2626','--dsw-alias-state-warn-primary':'#d97706','--dsw-alias-state-success-primary':'#16a34a',
  };
  for(const [key,value] of Object.entries(tokens)) document.documentElement.style.setProperty(key,value);
};
window.setTheme('light');
