import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

for(const language of ['en','zh']) test('emitted model editor '+language+' stages scoped exact native IDs and protects drafts from concurrent revisions',{timeout:30000},async t=>{
 const emitted=(await build({stdin:{contents:
  "import React from 'react';import{createRoot}from'react-dom/client';import{createModelPolicySettingsView}from'./client/model-policy-settings.ts';"+
  "const listeners=new Set();let state={status:'ready',writable:true,revision:2,value:{root:null,descendants:null,workspaceOverrides:[]}};window.writes=[];window.accepted=()=>state;const notify=()=>{for(const f of listeners)f()};window.sibling=()=>{state={...state,revision:state.revision+1};notify()};"+
  "const form={getSnapshot:()=>state,subscribe:f=>{listeners.add(f);return()=>listeners.delete(f)},mutate:async(ops,revision)=>{window.writes.push({ops,revision});if(revision!==state.revision)return false;const value=structuredClone(state.value);for(const op of ops){if(op.op==='unset')delete value[op.path[0]];else value[op.path[0]]=op.value}state={...state,value,revision:revision+1};notify();return true}};"+
  "const locale={getLocale:()=>({active:"+JSON.stringify(language)+"}),subscribe:()=>()=>{},resolveText:t=>t["+JSON.stringify(language)+"]};const catalog={load:async()=>({ok:true,value:{groups:[{id:'Exact/P',models:[{id:'Exact/M',reasoning:{efforts:[{id:'Opaque:HI',name:'Native high'}]}}]}]}})};const View=createModelPolicySettingsView(React,catalog,locale);createRoot(document.getElementById('root')).render(React.createElement(View,{form,runtime:{capabilities:{modelPolicy:{phase:'active'}}},workspaceId:'native-workspace'}));",
 resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
 const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<div id="root"></div><script>'+emitted+'</script>');});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const port=(server.address() as any).port;assert.notEqual(port,3080);
 const browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,args:['--no-sandbox']});t.after(()=>browser.close());
 const page=await browser.newPage();page.setDefaultTimeout(5000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+port);
 const zh=language==='zh';const scope=page.getByRole('combobox',{name:zh?'范围':'Scope',exact:true});await scope.selectOption('workspace');
 const root=page.getByRole('group',{name:zh?'根代理':'Root agent',exact:true});await root.getByRole('combobox',{name:zh?'根代理 模式':'Root agent mode',exact:true}).selectOption('exact');
 await root.getByRole('textbox',{name:(zh?'根代理':'Root agent')+' provider',exact:true}).fill('Exact/P');await root.getByRole('textbox',{name:(zh?'根代理':'Root agent')+' model',exact:true}).fill('Exact/M');
 await page.getByRole('button',{name:zh?'刷新原生推理强度选项':'Refresh native effort choices',exact:true}).click();await root.getByRole('combobox',{name:zh?'根代理 原生推理强度':'Root agent native efforts',exact:true}).selectOption('Opaque:HI');
 assert.equal(await page.evaluate(()=>(window as any).writes.length),0);
 await scope.selectOption('global');await scope.selectOption('workspace');assert.equal(await root.getByRole('textbox',{name:(zh?'根代理':'Root agent')+' model',exact:true}).inputValue(),'Exact/M');
 await page.getByRole('button',{name:zh?'保存模型策略':'Save model policy',exact:true}).click();await page.waitForFunction(()=>(window as any).writes.length===1);
 assert.deepEqual(await page.evaluate(()=>(window as any).accepted().value.workspaceOverrides),[{workspaceId:'native-workspace',root:{provider:'Exact/P',model:'Exact/M',reasoningEffort:'Opaque:HI'}}]);
 await root.getByRole('textbox',{name:(zh?'根代理':'Root agent')+' model',exact:true}).fill('unsaved');await page.evaluate(()=>(window as any).sibling());
 await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:zh?'保存模型策略':'Save model policy',exact:true}).isDisabled(),true);assert.equal(await root.getByRole('textbox',{name:(zh?'根代理':'Root agent')+' model',exact:true}).inputValue(),'unsaved');assert.deepEqual(errors,[]);
});
