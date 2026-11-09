import React from "react";
import { createRoot } from "react-dom/client";
import { createRequestRecoveryAdapter } from "../../client/request-recovery.ts";
const root = createRoot(document.getElementById("root"));
let registration;
let Component;
let sessionId = "session-a";
let enabled = true;
let locale = "en";
const listeners = /* @__PURE__ */ new Set();
const localeListeners = /* @__PURE__ */ new Set();
const sessionListeners = /* @__PURE__ */ new Set();
let snapshot = { sessionId, running: false, openState: "open", removed: false };
const outline = [{turn:1,seq:1,prompt:"",response:""},{turn:2,seq:6,prompt:"",response:""}];
const session = { projections: {faceOf: () => ({getSnapshot: () => outline, subscribe: () => () => {}})}, getSnapshot: () => snapshot, subscribe: (fn) => {
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
} };
const effect = (fn) => fn();
const ctx = {
  effect,
  inject(_names, fn) {
    const cleanups = [];
    fn({...ctx, effect(callback) { const off = callback(); cleanups.push(off); return off; }});
    return () => { for (const off of cleanups.reverse()) if (typeof off === 'function') off(); };
  },
  get(name) {
    return name === "locale" ? { getLocale: () => ({ active: locale }), subscribe: (fn) => {
      localeListeners.add(fn);
      return () => localeListeners.delete(fn);
    }, resolveText: (text) => text[locale] } : void 0;
  },
  sessions: { binding(id) {
    return { sessionId: id, session };
  } },
  slots: { inject(name, fn) {
    if (name !== "conversation.chat.turnTail") throw Error("wrong native slot");
    return fn();
  }, register(options, view) {
    if (!options.id || options.key) throw Error("native list entry id required");
    registration = options;
    Component = view;
    render();
    return () => {
      Component = void 0;
      render();
    };
  } }
};
function render() {
  root.render(React.createElement("main", null, ...[1, 2].map((turn) => React.createElement("section", { key: sessionId + turn, "data-turn": turn }, Component ? React.createElement(Component, { ...registration.inject(sessionId), turn: { turn, status: "closed", start: {type:"turn/start",seq:turn===2?6:1,data:{turn}}, end: { type:"turn/end",seq: turn === 2 ? 10 : 5, data: {turn, reason: { kind: "error" } } } }, seq: 0 }) : null))));
}
const stop = createRequestRecoveryAdapter(React).mount(ctx, { rowId: "recovery-fixture", enabled: () => enabled, subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
} });
window.recoveryHarness = { setEnabled(v) {
  enabled = v;
  for (const fn of listeners) fn();
}, select(id) {
  sessionId = id;
  snapshot = { sessionId, running: false, openState: "open", removed: false };
  render();
}, pulse() {
  snapshot = { ...snapshot };
  for (const fn of sessionListeners) fn();
}, running(v) {
  snapshot = { ...snapshot, running: v };
  for (const fn of sessionListeners) fn();
}, locale(v) {
  locale = v;
  for (const fn of localeListeners) fn();
}, stop };
