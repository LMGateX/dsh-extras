/** Exact stock native operation, separate from optional checkpoint recovery. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime,load,llm,runTurn,events} from '../modules/retry/runtime.ts';

async function fixture(t:any,code='SERVER',failures=2){
 assert.ok(process.env.HOME?.startsWith('/tmp/'),'disposable HOME required');
 assert.ok(process.env.DSH_HOME?.startsWith('/tmp/'),'disposable DSH_HOME required');
 const runtime=await createRuntime({retry:false});t.after(()=>runtime.dispose());
 const {ctx}=runtime;const off=()=>()=>{};
 // Only unrelated transport/attachment/workspace faces are deterministic doubles.
 // Native Controller, projection, maintenance, inbox, AgentLoop and LLM are real.
 ctx.reflect.provide('typert',{lookups:{configure:off},contexts:{configureHost:off},resources:{register:off}});
 ctx.reflect.provide('typertGateway',{getPendingRemoteEvents:()=>[]});
 ctx.reflect.provide('agentDefaultModel',{currentSelection:()=>({provider:'integration-mock',model:'integration-model'})});
 ctx.reflect.provide('attachments',{imageLimits:{maxImageBytes:1,maxImagesPerMessage:1,maxMessageImageBytes:1,maxImagePixels:1,maxImageDimension:1,mediaTypes:[]}});
 ctx.reflect.provide('fileUploads',{registerAgentResolver:off});
 ctx.reflect.provide('fs',{});ctx.reflect.provide('remoteAccess',{allows:()=>true});
 ctx.reflect.provide('workspaceRegistry',{archivedSessionIds:[]});ctx.reflect.provide('sessionQuery',{});
 const controllerModule=await load<any>('dsh-api-session-controller');
 await ctx.plugin(controllerModule.default,{}).await();
 const handle=await runtime.createAgent({sessionId:'native-continue',adapter:{failure:new llm.LlmError('offline failure',code),failures}});
 const request=(requestId:string,mode='queue')=>({sessionId:handle.agent.id,requestId,content:[],mode});
 const prompt=(id:string,mode='queue')=>ctx.sessionController.prompt(request(id,mode),new AbortController().signal);
 return {runtime,ctx,handle,prompt};
}

test('stock Continue generating is a durable empty normal followup, not captured request replay',async t=>{
 const {handle,prompt}=await fixture(t);
 await assert.rejects(prompt('fresh'));
 await runTurn(handle,'original human task');
 assert.equal(handle.agent.recovery,undefined,'stock has no optional checkpoint capability');
 assert.deepEqual(await prompt('continue-one'),{accepted:true});await handle.agent.whenIdle();
 assert.equal(handle.state.requests.length,2);
 assert.deepEqual(await prompt('continue-one'),{accepted:true});await handle.agent.whenIdle();assert.equal(handle.state.requests.length,2,'native request-id deduplication');
 assert.deepEqual(await prompt('continue-two'),{accepted:true});await handle.agent.whenIdle();
 assert.equal(handle.state.requests.length,3);
 const retries=events(handle.state,'user/message').filter((e:any)=>e.data.source.kind==='retry');
 assert.deepEqual(retries.map((e:any)=>({content:e.data.content,rpcId:e.data.source.rpcId})),[{content:[],rpcId:'continue-one'},{content:[],rpcId:'continue-two'}]);
 assert.deepEqual(handle.state.requests[1].messages.filter((m:any)=>m.role==='user').map((m:any)=>m.content),[[{type:'text',text:'original human task'}],[]]);
 assert.deepEqual(events(handle.state,'turn/end').map((e:any)=>e.data.reason.kind),['error','error','completed']);
 assert.equal(events(handle.state,'turn/start').length,3,'native continuation opens a new turn');
 assert.equal(events(handle.state,'request/failure').length,0,'no unofficial checkpoint metadata');
 await assert.rejects(prompt('completed'));
});

for(const code of ['AUTH','INVALID_CREDENTIAL','MODEL_UNSUPPORTED','UNSUPPORTED_REASONING_EFFORT','ABORTED'])test('native continue refuses noncontinuable failure '+code,async t=>{
 const {handle,prompt}=await fixture(t,code,1);await runTurn(handle);
 assert.equal(handle.state.requests.length,1);await assert.rejects(prompt('must-refuse'));
 assert.equal(handle.state.requests.length,1);assert.equal(events(handle.state,'user/message').filter((e:any)=>e.data.source.kind==='retry').length,0);
});

test('native continue refuses steering, queued human input and concurrent maintenance',async t=>{
 const {handle,prompt}=await fixture(t);await runTurn(handle);
 await assert.rejects(prompt('steer','steer'));
 const message=llm.createUserMessage({content:[{type:'text',text:'pending human'}],source:{kind:'user'}});
 handle.agent.inbox.append('next-turn',message);await assert.rejects(prompt('pending'));handle.agent.inbox.clear();
 await handle.agent.runMaintenance(async()=>{await assert.rejects(prompt('maintenance'));});
 assert.equal(handle.state.requests.length,1);
});
