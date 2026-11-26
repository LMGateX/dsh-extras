import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { loadHost, loaderFixture, response } from '../integration/loader-harness.ts';
import * as retry from '../../src/modules/retry/index.ts';

export async function fixture(t: any, {pi = false, account = false, foreignPi = false} = {}) {
  const deepseek = await loadHost('dsh-llm-deepseek-api-key');
  const nativePi = await loadHost('dsh-llm-pi-ai');
  const deepseekAccount = await loadHost('dsh-llm-deepseek-account');
  const f = await loaderFixture(t, {name:'dsh-extras-retry',moduleIds:['retry'],modulePlugins:{retry}},
    {modules:{retry:{enabled:false}},migration:{auto:false}}, undefined,
    [{id:'custom-deepseek',name:'@deepseek-ai/dsh-llm-deepseek-api-key',config:{baseURL:'https://example.invalid',opaqueFuture:{keep:true},retryPolicy:{mode:'normal',retryableCodes:['SERVER']}}},
      ...(pi || foreignPi ? [{id:'native-pi',name:'@deepseek-ai/dsh-llm-pi-ai',config:{providers:{openai:{apiKeyEnv:'TEST_ONLY_KEY',headers:{Authorization:'disposable-test-secret'},opaqueFuture:{keep:true}},anthropic:{retryPolicy:{mode:'normal',maxRetries:0}}}}}] : []),
      ...(account ? [{id:'native-account',name:'@deepseek-ai/dsh-llm-deepseek-account',config:{retryPolicy:{mode:'normal',maxRetries:2}}}] : []),
    ], undefined,
    {'@deepseek-ai/dsh-llm-deepseek-api-key':deepseek,
      '@deepseek-ai/dsh-llm-pi-ai':foreignPi ? {name:'foreign-pi',Config:nativePi.Config,apply(){}} : nativePi,
      '@deepseek-ai/dsh-llm-deepseek-account':deepseekAccount,
    });
  await f.ready(); await f.update({modules:{retry:{enabled:false}},migration:{auto:false}});
  // The native DeepSeek provider rows now wait on the real deployment/credential
  // authority. No API key, account token or provider network call is needed.
  await f.ctx.plugin((await loadHost('dsh-deepseek-auth')).default).await();
  await f.ctx.plugin((await loadHost('dsh-llm')).default).await();
  await f.loader.await();
  await f.ctx.plugin((await loadHost('dsh-settings')).default).await();
  await f.loader.await();
  async function request(method='GET', body?: unknown, headers: Record<string,string> = {host:f.host,cookie:f.ownerCookie,'content-type':'application/json'}) {
    const route = f.routes.get('/extras/dsh-extras-retry/retry-policy'); assert.ok(route, 'retry route registered');
    const req = Readable.from(body === undefined ? [] : [typeof body === 'string' ? body : JSON.stringify(body)]);
    Object.assign(req,{method,headers}); const res=response(); await route.handler(req,res); return {...res,json:res.body ? JSON.parse(res.body) : undefined};
  }
  return {...f,request};
}

