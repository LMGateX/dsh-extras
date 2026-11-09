#!/usr/bin/env node
/** Public emitted Agent/LLM probe; the only substitute is a deterministic external model transport. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,realpath} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const anchor=resolve(process.argv[2]??'');assert.ok(process.argv[2],'usage: node probe-agent.mjs HOST_PACKAGE_JSON');
assert.ok(process.env.HOME?.startsWith('/tmp/')&&process.env.DSH_HOME?.startsWith('/tmp/'),'explicit disposable HOME and DSH_HOME required');
const host=await realpath(dirname(anchor));const requireHost=createRequire(anchor);
const load=async name=>{const path=await realpath(requireHost.resolve(name));assert.ok(path.startsWith(host+'/'),'runtime escaped staged graph: '+path);return import(pathToFileURL(path).href);};
const {Context}=await load('@deepseek-ai/cordis');
const packages=['@deepseek-ai/dsh-agent','@deepseek-ai/dsh-agent-loop','@deepseek-ai/dsh-session','@deepseek-ai/dsh-llm-retry','@deepseek-ai/dsh-goal','@deepseek-ai/dsh-goal-round-driver','@deepseek-ai/dsh-llm','@deepseek-ai/dsh-compaction-basic'];
const identities=[];
for(const name of packages){const entry=await realpath(requireHost.resolve(name));const fromEntry=createRequire(entry);const cordis=await realpath(fromEntry.resolve('@deepseek-ai/cordis'));assert.ok(cordis.startsWith(host+'/'));assert.equal((await import(pathToFileURL(cordis).href)).Context,Context,'split Context identity: '+name);identities.push({name,entry,cordis});}
const {default:Agents}=await load('@deepseek-ai/dsh-agent');
const {default:Loop}=await load('@deepseek-ai/dsh-agent-loop');
const {default:Llm,LlmAdapter,resolveRetryPolicy,createUserMessage}=await load('@deepseek-ai/dsh-llm');
const {default:Sessions,SessionId}=await load('@deepseek-ai/dsh-session');
const {default:Projections}=await load('@deepseek-ai/dsh-session-projection');
const {default:SystemPrompt}=await load('@deepseek-ai/dsh-system-prompt');
const {default:Tools}=await load('@deepseek-ai/dsh-tools');
const Executor=await load('@deepseek-ai/dsh-tool-executor-native');
const Retry=await load('@deepseek-ai/dsh-llm-retry');
class Transport extends LlmAdapter {
 requests=[];
 resolveModel(provider,model){return Promise.resolve({provider,id:model,name:model});}
 providerRetryPolicy(){return resolveRetryPolicy({mode:'normal',maxRetries:0,backoff:{initialDelayMs:1,maxDelayMs:1,jitterRatio:0}});}
 async *stream(options){const {signal,...request}=options;this.requests.push({...structuredClone(request),signal});if(this.requests.length===1){yield {type:'finish',reason:{kind:'error',failure:{code:'SERVER',message:'candidate verification fixture failure'}}};return;}yield {type:'block-start',index:0,blockType:'text'};yield {type:'text-delta',index:0,text:'recovered'};yield {type:'block-end',index:0,block:{type:'text',text:'recovered'}};yield {type:'finish',reason:{kind:'stop'}};}
}
const ctx=new Context();
try{
 for(const plugin of [Llm,Sessions,Projections,SystemPrompt,Tools,Executor,Agents,Retry])await ctx.plugin(plugin);
 await ctx.plugin(Loop,{agents:[]});
 const transport=new Transport();ctx.llm.registerAdapter(['candidate-fixture'],transport);
 const {agent}=await ctx.agents.create({sessionId:SessionId('candidate-verification-'+process.pid),agentOptions:{provider:'candidate-fixture',model:'deterministic'}});
 agent.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text:'candidate staging verification'}]}));await agent.whenIdle();
 assert.equal(transport.requests.length,1);assert.equal(agent.status,'idle');
 assert.equal(typeof agent.recovery?.read,'function','native terminal recovery surface missing');
 const state=agent.recovery.read();assert.equal(state.protocol,'dsh.request-recovery.v1');assert.equal(state.lifetime,'process-local');assert.equal(state.status,'available');
 const checkpoint=state.checkpoint;const boundary=agent.session.seq;
 const command={sessionId:agent.id,checkpointId:checkpoint.checkpointId,expectedRevision:checkpoint.revision,operationId:'stage-verification-operation'};
 const receipt=await agent.recovery.retry(command);assert.equal(receipt.status,'accepted');await agent.whenIdle();
 const duplicate=await agent.recovery.retry(command);assert.deepEqual(duplicate,receipt);assert.equal(transport.requests.length,2);
 const {signal:originalSignal,...original}=transport.requests[0];const {signal:recoverySignal,...recovered}=transport.requests[1];assert.deepEqual(recovered,original);assert.notEqual(originalSignal,recoverySignal);
 assert.deepEqual(agent.session.snapshotEvents(boundary).filter(event=>['user/message','developer/message','system/message'].includes(event.type)),[]);
 assert.equal(agent.session.snapshotEvents().at(-1).data.reason.kind,'completed');
 console.log(JSON.stringify({publicAgentRecovery:'passed',protocol:state.protocol,lifetime:state.lifetime,requests:transport.requests.length,duplicate:'same receipt, no extra dispatch',modelVisibleMessagesAdded:0,identities},null,2));
}finally{await ctx.fiber.dispose();}
