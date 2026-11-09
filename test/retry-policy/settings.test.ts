import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.ts';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {response} from '../integration/loader-harness.ts';

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
  const f=await fixture(t,true); const before=await f.request();
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
