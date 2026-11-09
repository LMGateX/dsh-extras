import React from 'react';
import {createRoot} from 'react-dom/client';
import {createReasoningSettingsView} from '../../client/reasoning-settings.ts';
import {createSharedCompactionSource} from '../../client/shared-compaction.ts';
import {createWorkspaceCatalog} from '../../client/workspace-settings.ts';
const source=createSharedCompactionSource();
const english={getLocale:()=>({active:'en'}),subscribe:()=>()=>{},resolveText:text=>text.en};
const workspaceListeners=new Set();
let workspaceState={items:[{workspaceId:'Opaque:A',title:'Workspace A',path:'/fixture/a',sessionIds:[],createdAt:'2026-01-01',updatedAt:'2026-01-01'},{workspaceId:'Opaque:B',title:'Workspace B',path:'/fixture/b',sessionIds:[],createdAt:'2026-01-01',updatedAt:'2026-01-01'}],archivedSessionIds:[],pinnedSessionIds:[],state:'idle',phase:'ready',error:null};
const workspaceService={list:{getSnapshot(){return workspaceState;},subscribe(fn){workspaceListeners.add(fn);return()=>workspaceListeners.delete(fn);}}};
const cleanups=[];const ctx={get:name=>name==='workspaces'?workspaceService:undefined,inject(names,callback){const off=callback(ctx);if(typeof off==='function')cleanups.push(off);}};
const View=createReasoningSettingsView(React,undefined,english,source,createWorkspaceCatalog(ctx));
window.setWorkspaces=value=>{workspaceState=value;for(const listener of workspaceListeners)listener();};
window.refreshShared=()=>source.refresh();
function form(){let snapshot={status:'ready',writable:true,revision:1,value:{compactionReasoning:{enabled:false,rules:[]}}};const listeners=new Set();return {getSnapshot:()=>snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},async mutate(ops,revision){if(revision!==snapshot.revision)return false;const value=structuredClone(snapshot.value);for(const op of ops){if(op.path.join('.')==='compactionReasoning.enabled')value.compactionReasoning.enabled=op.value;}snapshot={...snapshot,value,revision:revision+1};for(const fn of listeners)fn();return true;}};}
const first=form(),second=form();
const root=createRoot(document.getElementById('root'));
root.render(React.createElement(React.Fragment,null,React.createElement('section',{'data-entry':'compact'},React.createElement(View,{form:first,rowId:'dsh-extras-compact-context'})),React.createElement('section',{'data-entry':'model'},React.createElement(View,{form:second,rowId:'dsh-extras-model-policy'}))));
window.unmount=()=>{root.unmount();for(const off of cleanups.reverse())off();};
