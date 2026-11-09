/** Fresh OS process, same explicit unofficial native anchor; no replay cache crosses this boundary. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
assert.ok(process.env.HOME?.startsWith('/tmp/'));assert.ok(process.env.DSH_HOME?.startsWith('/tmp/'));assert.equal(process.env.DSH_PROFILE,'isolated');
const anchor=process.env.DSH_RECOVERY_CANDIDATE_ANCHOR;assert.ok(anchor?.startsWith('/tmp/'));
const require=createRequire(anchor);const load=async name=>import(pathToFileURL(require.resolve('@deepseek-ai/'+name)).href);
const {Context}=await load('cordis');const ctx=new Context();
try{
 for(const name of ['dsh-llm','dsh-session','dsh-session-projection','dsh-system-prompt','dsh-tools','dsh-tool-executor-native','dsh-agent','dsh-llm-retry']){const m=await load(name);await ctx.plugin(m.default??m).await();}
 const loop=await load('dsh-agent-loop');await ctx.plugin(loop.default??loop,{agents:[]}).await();
 const input=JSON.parse(await readFile(process.argv[2],'utf8'));const llm=await load('dsh-llm');let requests=0;
 class Offline extends llm.LlmAdapter{async resolveModel(provider,id){return{provider,id,name:id};}async *stream(){requests++;throw Error('restart must never infer request reconstruction');}}
 ctx.llm.registerAdapter([input.sessionId],new Offline());
 const owned=await ctx.agents.create({sessionId:input.sessionId,seed:input.seed,agentOptions:{provider:input.sessionId,model:'offline-model',reasoningEffort:'low'}});
 const view=owned.agent.recovery.read();assert.equal(view.status,'unavailable');assert.equal(view.reason,'exact-snapshot-unavailable');
 const receipt=await owned.agent.recovery.retry(input.command);assert.equal(receipt.status,'rejected');assert.equal(requests,0);
 await owned.dispose();console.log(JSON.stringify({freshProcess:true,view,receipt,requests,seedAuditPreserved:input.seed.some(event=>event.type==='request/failure')}));
}finally{await ctx.fiber.dispose();}
