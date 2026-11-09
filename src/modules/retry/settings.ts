/** Provider-owned native settings bridge. This module never dispatches model requests. */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

export interface RetryPolicyDraft {
  mode: 'normal' | 'always'; maxRetries?: number;
  initialDelayMs: number; maxDelayMs: number; jitterRatio: number;
}
export interface RetrySettingsTarget {
  id: string; namespace: string; provider: string; revision: number;
  policy: RetryPolicyDraft;
}
export interface RetrySettingsSnapshot {
  writable: boolean; targets: RetrySettingsTarget[];
  recovery: {phase:'unavailable';reason:'native-terminal-recovery-unavailable'};
  diagnostic?: string;
}
export const RETRY_BODY_LIMIT = 8192;
const providers = ['dsh-llm-deepseek-api-key','dsh-llm-deepseek-account','dsh-llm-pi-ai'];
const recovery = {phase:'unavailable',reason:'native-terminal-recovery-unavailable'} as const;
const plain = (v: any): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function fail(status: number, code: string): never { throw Object.assign(new Error(code), {status,code}); }
function draft(value: any, resolve: any): RetryPolicyDraft {
  const p = resolve(value, 'retryPolicy');
  return {mode:p.mode,...p.mode === 'normal' ? {maxRetries:p.maxRetries} : {},initialDelayMs:p.initialDelayMs,maxDelayMs:p.maxDelayMs,jitterRatio:p.jitterRatio};
}
async function nativeContract(anchor: string) {
  const require = createRequire(anchor);
  const manifest = JSON.parse(await readFile(require.resolve('@deepseek-ai/dsh/package.json'),'utf8'));
  if (manifest.version !== '0.2.2-rc.1') fail(503,'native-retry-settings-unavailable');
  const llm = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-llm')).href);
  const schemas = new Map<string,unknown>();
  for (const name of providers) {
    try { const m = await import(pathToFileURL(require.resolve('@deepseek-ai/'+name)).href); schemas.set('@deepseek-ai/'+name,m.Config); } catch { /* optional provider */ }
  }
  if (typeof llm.resolveRetryPolicy !== 'function') fail(503,'native-retry-settings-unavailable');
  return {resolve:llm.resolveRetryPolicy,schemas};
}
/** Root-level hook keeps provider settings editable when the classifier is disabled. */
export function mountRetrySettings(ctx: Context, distribution: string): void {
  ctx.inject(['webServer','connection','settings','configEditor','profileContext'], routeCtx => {
    const services = routeCtx as any;
    let live = true;
    routeCtx.effect(() => () => {live=false;});
    const contract = nativeContract(services.profileContext.installAnchor);
    // Do not allow an optional unsupported contract to become an unhandled rejection.
    void contract.catch(() => {});
    const handler = async (req: IncomingMessage, res: ServerResponse) => {
      const json = (status:number, value:unknown) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(value)); };
      try {
        const admission = services.connection.admit(req);
        if ('rejection' in admission) {res.writeHead(admission.rejection);res.end();return;}
        if (admission.peer.principal.kind !== 'owner') {res.writeHead(403);res.end();return;}
        if (req.method !== 'GET' && req.method !== 'PUT') {res.writeHead(405,{Allow:'GET, PUT'});res.end();return;}
        const {resolve,schemas} = await contract;
        const inventory = () => {
          const rows = services.settings.describe({redactSecrets:true});
          const entries = services.configEditor.entries();
          const targets: (RetrySettingsTarget & {path:string[]})[] = [];
          for (const row of rows) {
            const matches = entries.filter((e:any)=>e.options.id===row.ns);
            if (matches.length !== 1) continue;
            const entry=matches[0]; const schema=schemas.get(entry.options.name);
            if (!schema || entry.moduleNamespace?.Config !== schema) continue;
            const add=(provider:string,path:string[],value:unknown) => targets.push({id:JSON.stringify([row.ns,provider]),namespace:row.ns,provider,revision:row.revision,path,policy:draft(value,resolve)});
            if (entry.options.name==='@deepseek-ai/dsh-llm-pi-ai') {
              if (plain(row.value?.providers)) for (const provider of Object.keys(row.value.providers)) {
                if (['__proto__','constructor','prototype'].includes(provider)) continue;
                add(provider,['providers',provider,'retryPolicy'],row.value.providers[provider]?.retryPolicy);
              }
            } else add(entry.options.name==='@deepseek-ai/dsh-llm-deepseek-api-key'?'deepseek-official':'deepseek-account',['retryPolicy'],row.value?.retryPolicy);
          }
          return targets;
        };
        const snapshot = ():RetrySettingsSnapshot => ({writable:services.settings.writable===true,targets:inventory().map(({path,...t})=>t),recovery});
        if (!live) fail(503,'retry-settings-disposed');
        if (req.method==='GET') {json(200,snapshot());return;}
        if (services.settings.writable!==true) fail(403,'retry-settings-readonly');
        if (String(req.headers['content-type']??'').split(';')[0]!.trim().toLowerCase()!=='application/json') fail(415,'retry-settings-content-type');
        const declared=Number(req.headers['content-length']);
        if (Number.isFinite(declared) && declared>RETRY_BODY_LIMIT) fail(413,'retry-settings-body-too-large');
        let bytes=0;const chunks:Buffer[]=[];
        for await (const chunk of req) {const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=b.length;if(bytes>RETRY_BODY_LIMIT) fail(413,'retry-settings-body-too-large');chunks.push(b);}
        let body:any;try {body=JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {fail(400,'invalid-retry-settings');}
        if (!plain(body) || Object.keys(body).some(k=>!['targetId','expectedRevision','policy'].includes(k)) || typeof body.targetId!=='string' || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision<0 || !plain(body.policy)) fail(400,'invalid-retry-settings');
        const p=body.policy;
        if (Object.keys(p).some(k=>!['mode','maxRetries','initialDelayMs','maxDelayMs','jitterRatio'].includes(k)) || !['normal','always'].includes(p.mode) || p.mode==='always' && Object.hasOwn(p,'maxRetries') || p.mode==='normal' && (!Number.isSafeInteger(p.maxRetries)||p.maxRetries<0) || !['initialDelayMs','maxDelayMs','jitterRatio'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))) fail(400,'invalid-retry-policy');
        const target=inventory().find(t=>t.id===body.targetId);if(!target) fail(404,'retry-target-unavailable');
        const policy={mode:p.mode,...p.mode==='normal'?{maxRetries:p.maxRetries}:{},backoff:{initialDelayMs:p.initialDelayMs,maxDelayMs:p.maxDelayMs,jitterRatio:p.jitterRatio}};
        try {resolve(policy,'retryPolicy');} catch {fail(400,'invalid-retry-policy');}
        if (!live) fail(503,'retry-settings-disposed');
        // Leaf operations deliberately preserve retryableCodes, credentials, unknown fields and sibling providers.
        const ops:any[]=[{op:'set',path:[...target.path,'mode'],value:p.mode},...['initialDelayMs','maxDelayMs','jitterRatio'].map(k=>({op:'set',path:[...target.path,'backoff',k],value:p[k]}))];
        if(p.mode==='normal') ops.push({op:'set',path:[...target.path,'maxRetries'],value:p.maxRetries});
        await services.settings.mutate(target.namespace,ops,body.expectedRevision);
        json(200,snapshot());
      } catch(error:any) {
        const conflict=error?.code==='SETTINGS_CONFLICT';
        json(conflict?409:error?.status??503,{error:conflict?'retry-settings-conflict':error?.status?error.code:'native-retry-settings-unavailable',recovery});
      }
    };
    routeCtx.effect(() => services.webServer.register({kind:'exact',path:'/extras/'+encodeURIComponent(distribution)+'/retry-policy',handler}));
  });
}
export const mountSettings = mountRetrySettings;
