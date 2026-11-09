import React from 'react';
import { createRoot } from 'react-dom/client';
import { Context } from '@deepseek-ai/cordis';

const descriptor = window.descriptor;
const ctx = new Context();
const views = new Map();
const root = createRoot(document.getElementById('root'));
const h = React.createElement;
window.starts = 0;
const NativeAudio = window.AudioContext;
window.AudioContext = class extends NativeAudio {
  createBufferSource() {
    const source = super.createBufferSource();
    const start = source.start.bind(source);
    source.start = (...args) => { window.starts++; return start(...args); };
    return source;
  }
};
let snapshot = { status: 'ready', writable: true, revision: 1, value: JSON.parse(localStorage.getItem(descriptor.rowId) || 'null') || { modules: Object.fromEntries(descriptor.moduleIds.map(id => [id, { enabled: true, ...(id === 'compact-context' ? { retryAttempts: 2, retryDelayMs: 1000, ptcTimeoutMs: 0, ptcModelTimeouts: {} } : {}), ...(id === 'chime' ? { debounceMs: 0, durationMs: 5000, minRingMs: 3000, banner: true } : {}) }])) } };
const listeners = new Set();
const form = {
  getSnapshot: () => snapshot,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  async mutate(ops, revision) {
    if (revision !== snapshot.revision || !snapshot.writable) return false;
    const value = structuredClone(snapshot.value);
    for (const op of ops) {
      const keys = [...op.path]; const key = keys.pop(); let node = value;
      for (const item of keys) node = node[item] ??= {};
      if (op.op === 'unset') delete node[key]; else node[key] = op.value;
    }
    snapshot = { ...snapshot, revision: snapshot.revision + 1, value };
    localStorage.setItem(descriptor.rowId, JSON.stringify(value));
    for (const fn of listeners) fn();
    return true;
  },
};
const provide = (name, value) => { ctx.provide(name); ctx.set(name, value); };
provide('locale', { getLocale: () => ({ active: 'en' }), subscribe: () => () => {}, resolveText: text => typeof text === 'string' ? text : text.en });

window.slotRenderErrors = [];
// Only these shell owners exist in this harness. Session/turn slots remain
// registered, but must be invoked by a conversation owner with a session ID.
const pageSlots = new Set(['plugins.bundle.config','sidebar.footer.action','shell.overlay']);
function render() {
  root.render(h(React.Fragment, null, ...[...views].filter(([,entry]) => pageSlots.has(entry.options.name)).map(([key, entry]) => {
    try { return h(entry.view, { key, view: 'page', ...(entry.options.inject?.() ?? {}) }); }
    catch(error) { window.slotRenderErrors.push({slot:entry.options.name,message:error.message}); throw error; }
  })));
}
provide('configForms', { get: () => form, whileServed(rows, callback) { return callback(); } });
provide('slots', {
  inject(name, callback) { return callback(); },
  register(options, view) { const key = options.name + ':' + (options.key ?? options.id); views.set(key, { options, view }); render(); return () => { views.delete(key); render(); }; },
});
window.slotDiagnostics = () => [...views].map(([key,entry])=>({key,slot:entry.options.name,hasInject:typeof entry.options.inject==='function'}));
let sessions = { ids: [], byId: {} };
const sessionListeners = new Set();
provide('sessions', {
  list: { getSnapshot: () => sessions, subscribe(fn) { sessionListeners.add(fn); return () => sessionListeners.delete(fn); } },
  binding(sessionId) {
    if(typeof sessionId !== 'string' || !sessionId) throw new Error('Session-owned slots require an explicit session ID');
    return sessions.byId[sessionId] ? {session:{getSnapshot:()=>sessions.byId[sessionId],subscribe(fn){sessionListeners.add(fn);return()=>sessionListeners.delete(fn);}}} : undefined;
  },
});
// A turn tail belongs to its conversation/session owner, not the settings page.
// Keep registration/injection testable without inventing a sessionless render.
window.turnTailMetadata = sessionId => [...views.values()].filter(entry=>entry.options.name==='conversation.chat.turnTail').map(entry=>{
  const props=entry.options.inject(sessionId);
  return {slot:entry.options.name,id:entry.options.id,sessionId:props.sessionId,bound:Boolean(props.session)};
});
window.setRunning = running => { sessions = { ids: ['a'], byId: { a: { running, title: 'Browser test session' } } }; for (const fn of sessionListeners) fn(); };
window.accepted = () => snapshot.value;
window.disableChime = () => form.mutate([{op:'set',path:['modules','chime','enabled'],value:false}],snapshot.revision);
window.fiber = undefined;
window.__ModuleLoader__ = { load(entry) { window.loadedId = entry.id; window.fiber = ctx.plugin(entry.factory(name => { if (name !== 'react') throw new Error(name); return React; })); } };
window.unload = async () => { await window.fiber?.dispose(); await ctx.fiber.dispose(); root.unmount(); };
window.ready = true;
