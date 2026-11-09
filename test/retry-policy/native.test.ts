/** Public native Agent/LLM seam; never a provider network call. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime,MockAdapter,llm,runTurn,events} from '../modules/retry/runtime.ts';

async function scenario(t:any, policy:any, permanent=false, cancelAt?:number) {
  const runtime=await createRuntime(); t.after(()=>runtime.dispose());
  const state={events:[] as any[],frames:[] as any[],requests:[] as any[]};
  class Offline extends MockAdapter {providerRetryPolicy(){return policy;}}
  runtime.ctx.llm.registerAdapter(['policy-proof'],new Offline(state,{failure:{code:permanent?'AUTH':'TRANSPORT',message:'offline failure'},failures:Infinity}));
  const handle=await runtime.ctx.agents.create({sessionId:'retry-policy-proof',agentOptions:{provider:'policy-proof',model:'integration-model'}});t.after(()=>handle.dispose());
  runtime.ctx.on('session/event',(session:any,event:any)=>{if(session.id!==handle.agent.id)return;state.events.push(event);if(event.type==='llm/retry'&&event.data.retry===cancelAt)queueMicrotask(()=>handle.agent.cancel({kind:'user'}));});
  await runTurn({...handle,state});return {...handle,state};
}

test('native normal five means six requests and terminal error has no structured exhaustion disposition', {timeout:10000},async t=>{
  const policy=llm.resolveRetryPolicy({mode:'normal',maxRetries:5,backoff:{initialDelayMs:1,maxDelayMs:1,jitterRatio:0}},'offline.policy');
  const {agent,state}=await scenario(t,policy);
  assert.equal(state.requests.length,6);assert.equal(events(state,'llm/retry').length,5);
  assert.equal(events(state,'step/start').length,1);assert.equal(events(state,'turn/end').length,1);
  const terminal=events(state,'turn/end')[0].data.reason;
  assert.equal(terminal.kind,'error');assert.equal(Object.hasOwn(terminal,'retryExhausted'),false);
  assert.equal(state.events.some((e:any)=>e.type==='llm/retry-exhausted'),false);
  assert.equal(events(state,'user/message').length,1);
  for(const method of ['retryFailedRequest','recoverFailedRequest','retryExhausted'])assert.equal(typeof agent[method],'undefined');
});

test('native always retries permanent AUTH failures beyond five and cancellation ends backoff without synthetic messages', {timeout:10000},async t=>{
  const policy=llm.resolveRetryPolicy({mode:'always',backoff:{initialDelayMs:1,maxDelayMs:1,jitterRatio:0}},'offline.policy');
  const {state}=await scenario(t,policy,true,7);
  assert.equal(state.requests.length,7);assert.equal(events(state,'llm/retry').length,7);
  assert.equal(events(state,'llm/retry-started').length,6);
  assert.equal(events(state,'turn/end').at(-1).data.reason.kind,'aborted');
  assert.equal(events(state,'user/message').length,1);assert.equal(events(state,'step/start').length,1);
});
