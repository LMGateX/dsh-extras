import React from 'react';
import {createRoot} from 'react-dom/client';
import {createReasoningSettingsView} from '../../client/reasoning-settings.ts';
import {createSharedCompactionSource} from '../../client/shared-compaction.ts';
const source=createSharedCompactionSource();
const english={getLocale:()=>({active:'en'}),subscribe:()=>()=>{},resolveText:text=>text.en};
const View=createReasoningSettingsView(React,undefined,english,source);
function form(){let snapshot={status:'ready',writable:true,revision:1,value:{compactionReasoning:{enabled:false,rules:[]}}};const listeners=new Set();return {getSnapshot:()=>snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},async mutate(ops,revision){if(revision!==snapshot.revision)return false;const value=structuredClone(snapshot.value);for(const op of ops){if(op.path.join('.')==='compactionReasoning.enabled')value.compactionReasoning.enabled=op.value;}snapshot={...snapshot,value,revision:revision+1};for(const fn of listeners)fn();return true;}};}
const first=form(),second=form();
const root=createRoot(document.getElementById('root'));
root.render(React.createElement(React.Fragment,null,React.createElement('section',{'data-entry':'compact'},React.createElement(View,{form:first,rowId:'dsh-extras-compact-context'})),React.createElement('section',{'data-entry':'model'},React.createElement(View,{form:second,rowId:'dsh-extras-model-policy'}))));
window.unmount=()=>root.unmount();
