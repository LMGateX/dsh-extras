import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.ts';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {Context} from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import {mountRetrySettings} from '../../src/modules/retry/settings.ts';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {response,until} from '../integration/loader-harness.ts';

test('owner can edit actual provider native policy while classifier disabled, without restating provider fields', async t => {
  const f=await fixture(t); const before=await f.request(); assert.equal(before.code,200);
  assert.equal(before.json.recovery.phase,'per-session'); assert.equal(before.json.targets.length,1);
  const target=before.json.targets[0]; assert.equal(target.provider,'deepseek-official');
  const llm=f.ctx.get('llm') as any; assert.equal(llm.providerRetryPolicy('deepseek-official').maxRetries,5); assert.equal(target.policy.maxRetries,5);
  const after=await f.request('PUT',{targetId:target.id,expectedRevision:target.revision,policy:{mode:'always',initialDelayMs:75,maxDelayMs:75,jitterRatio:0}});
  assert.equal(after.code,200);
  assert.equal(llm.providerRetryPolicy('deepseek-official').mode,'always');
  const row=(f.ctx.get('settings') as any).describe().find((x:any)=>x.ns==='custom-deepseek');
  assert.equal(row.value.baseURL,'https://example.invalid');
  const raw=[...f.loader.entries()].find(e=>e.options.id==='custom-deepseek')!.options.config as any;
  assert.deepEqual(raw.opaqueFuture,{keep:true});
  assert.deepEqual(row.value.retryPolicy.retryableCodes,['SERVER']);
  assert.equal(row.value.retryPolicy.mode,'always'); assert.equal(row.value.retryPolicy.backoff.initialDelayMs,75);
  assert.equal((await f.request('PUT',{targetId:target.id,expectedRevision:target.revision,policy:{mode:'normal',maxRetries:5,initialDelayMs:500,maxDelayMs:10000,jitterRatio:0.1}})).code,409);
});

test('native pi profiles are independent targets and secrets/unknown siblings survive a leaf edit', async t => {
  const f=await fixture(t,{pi:true}); const before=await f.request();
  assert.equal(before.code,200); assert.equal(before.json.targets.length,3);
  assert.ok(!JSON.stringify(before.json).includes('disposable-test-secret'));
  const target=before.json.targets.find((x:any)=>x.provider==='openai');assert.ok(target);
  const after=await f.request('PUT',{targetId:target.id,expectedRevision:target.revision,policy:{mode:'normal',maxRetries:0,initialDelayMs:50,maxDelayMs:50,jitterRatio:0}});
  assert.equal(after.code,200);
  const raw=[...f.loader.entries()].find(e=>e.options.id==='native-pi')!.options.config as any;
  assert.equal(raw.providers.openai.headers.Authorization,'disposable-test-secret');
  assert.deepEqual(raw.providers.openai.opaqueFuture,{keep:true});
  assert.equal(raw.providers.openai.retryPolicy.maxRetries,0);
  const llm=f.ctx.get('llm') as any;
  assert.equal(llm.providerRetryPolicy('openai').maxRetries,0);
  assert.equal(llm.providerRetryPolicy('openai').initialDelayMs,50);
  assert.equal(llm.providerRetryPolicy('anthropic').maxRetries,0);
  assert.equal(raw.providers.anthropic.retryPolicy.maxRetries,0);
  const stored=await readFile(join(f.profile,'cordis.patch.yml'),'utf8');
  assert.ok(stored.includes('disposable-test-secret'));assert.ok(stored.includes('opaqueFuture'));
});

test('the native DeepSeek account route owns its policy without an account credential', async t => {
  const f=await fixture(t,{account:true});
  const before=await f.request();
  assert.equal(before.code,200);
  assert.equal(before.json.targets.length,2);
  const target=before.json.targets.find((row:any)=>row.provider==='deepseek-account');
  assert.ok(target);
  assert.equal(target.namespace,'native-account');
  assert.equal(target.policy.maxRetries,2);
  const after=await f.request('PUT',{targetId:target.id,expectedRevision:target.revision,policy:{mode:'normal',maxRetries:1,initialDelayMs:50,maxDelayMs:100,jitterRatio:0}});
  assert.equal(after.code,200);
  assert.equal((f.ctx.get('llm') as any).providerRetryPolicy('deepseek-account').maxRetries,1);
});

test('a foreign Loader row cannot become a retry target by reusing the native provider schema', async t => {
  const f=await fixture(t,{foreignPi:true});
  const before=await f.request();
  assert.equal(before.code,200);
  assert.deepEqual(before.json.targets.map((target:any)=>target.provider),['deepseek-official']);
  const result=await f.request('PUT',{targetId:JSON.stringify(['native-pi','openai']),expectedRevision:0,policy:{mode:'normal',maxRetries:0,initialDelayMs:50,maxDelayMs:50,jitterRatio:0}});
  assert.equal(result.code,404);
});

test('older, unknown, and wrongly named host manifests close native policy access before inventory', async t => {
  const f=await fixture(t);
  for (const [index, [name, version, llmVersion]] of [
    ['@deepseek-ai/dsh','0.2.2-rc.4','0.2.3-alpha.2'],
    ['@deepseek-ai/dsh','0.2.3-alpha.1','0.2.3-alpha.2'],
    ['@deepseek-ai/dsh','0.2.3-alpha.20','0.2.3-alpha.2'],
    ['foreign-dsh','0.2.3-alpha.2','0.2.3-alpha.2'],
    ['@deepseek-ai/dsh','0.2.3-alpha.2','0.2.2-rc.4'],
  ].entries()) {
    const scope=join(f.root,`synthetic-host-${index}`,'node_modules','@deepseek-ai');
    await mkdir(join(scope,'dsh'),{recursive:true});
    const installAnchor=join(scope,'dsh','package.json');
    await writeFile(installAnchor,JSON.stringify({name,version}));
    // Enough of the LLM package shape for the route to reach inventory if it
    // incorrectly treats the CLI/LLM version or package name as compatible.
    const llmDir=join(scope,'dsh-llm');
    await mkdir(llmDir);
    await writeFile(join(llmDir,'package.json'),JSON.stringify({name:'@deepseek-ai/dsh-llm',version:llmVersion,exports:{'.':'./index.mjs','./package.json':'./package.json'}}));
    await writeFile(join(llmDir,'index.mjs'),'export function resolveRetryPolicy() {}');
    const ctx=new Context();
    let route:any;
    let inventories=0;
    ctx.reflect.provide('profileContext',{installAnchor});
    ctx.reflect.provide('webServer',{register(value:any){route=value;return ()=>{route=undefined;};}});
    ctx.reflect.provide('connection.authentication',{});
    ctx.reflect.provide('connection',{admit(){return {peer:{principal:{kind:'owner'}}};}});
    ctx.reflect.provide('configEditor',{});
    ctx.reflect.provide('settings',{describe(){inventories++;return [];}});
    try {
      mountRetrySettings(ctx,'synthetic-host');
      await until(()=>route,Boolean,'synthetic host mounted retry route');
      const res=response();
      await route.handler({method:'GET',headers:{}},res);
      assert.equal(res.code,503);
      assert.equal(JSON.parse(res.body).error,'native-retry-settings-unavailable');
      assert.equal(inventories,0);
    } finally { await ctx.fiber.dispose(); }
  }
});

test('a credential authenticated by native Connection as a non-owner cannot read or edit policy', async t => {
  const f=await fixture(t);
  let admitted=0;
  f.ctx.inject(['connection','connection.authentication'], scope => {
    const peer=scope.connection.createPeer({principal:{kind:'retry-fixture-guest'} as never});
    scope['connection.authentication'].register({authenticate(req){
      const cookie=req.headers instanceof Headers ? req.headers.get('cookie') : req.headers.cookie;
      if (cookie!=='fixture-guest=opaque') return undefined;
      admitted++;
      return peer;
    }});
  });
  await f.loader.await();
  const headers={host:f.host,cookie:'fixture-guest=opaque','content-type':'application/json'};
  const before=await f.request();
  assert.equal((await f.request('GET',undefined,headers)).code,403);
  assert.equal((await f.request('PUT',{},headers)).code,403);
  assert.equal(admitted,2,'native authentication recognized the non-owner credential');
  assert.deepEqual((await f.request()).json,before.json);
});

test('native owner admission, MIME, size, and semantic fences reject before mutations', async t => {
  const f=await fixture(t);
  assert.equal((await f.request('GET',undefined,{host:f.host})).code,401);
  assert.equal((await f.request('GET',undefined,{host:'evil.invalid',cookie:f.ownerCookie})).code,403);
  assert.equal((await f.request('PUT',{}, {host:f.host,cookie:f.ownerCookie,origin:'https://evil.invalid'})).code,403);
  assert.equal((await f.request('POST')).code,405);
  assert.equal((await f.request('PUT',{}, {host:f.host,cookie:f.ownerCookie,'content-type':'text/plain'})).code,415);
  assert.equal((await f.request('PUT','x'.repeat(8193))).code,413);
  const before=await f.request();const target=before.json.targets[0];
  assert.equal((await f.request('PUT',{targetId:target.id,expectedRevision:target.revision,policy:{mode:'normal',maxRetries:5,initialDelayMs:100,maxDelayMs:50,jitterRatio:0}})).code,400);
  assert.equal((await f.request()).json.targets[0].revision,target.revision);
});

test('root disposal removes management route and captured handler cannot mutate later',async t=>{
  const f=await fixture(t);const route=f.routes.get('/extras/dsh-extras-retry/retry-policy');assert.ok(route);
  await f.dispose();assert.equal(f.routes.has('/extras/dsh-extras-retry/retry-policy'),false);
  const req=Readable.from([]);Object.assign(req,{method:'GET',headers:{host:f.host,cookie:f.ownerCookie}});
  const res=response();await route.handler(req,res);assert.notEqual(res.code,200);
});
