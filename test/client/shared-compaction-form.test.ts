import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedCompactionSource} from '../../client/shared-compaction.ts';

test('two policy forms observe the same accepted revision and stale writes do not overwrite',async()=>{
 let document={revision:4,defaults:{enabled:true,rules:[{scope:'all',mode:'inherit'}]},workspaceOverrides:{}};
 const requests:{method:string;body?:any}[]=[];
 const fetcher=(async(_url:any,init:any={})=>{
  requests.push({method:init.method??'GET',body:init.body&&JSON.parse(init.body)});
  if(init.method==='PUT'){const candidate=JSON.parse(init.body);if(candidate.expectedRevision!==document.revision)return new Response(JSON.stringify({current:document}),{status:409});document={revision:document.revision+1,defaults:candidate.defaults,workspaceOverrides:candidate.workspaceOverrides};}
  return new Response(JSON.stringify(document),{status:200});
 }) as typeof fetch;
 const source=createSharedCompactionSource(fetcher);
 await source.refresh('dsh-extras');
 const first=source.form(),second=source.form();
 assert.equal(first.getSnapshot().revision,4);
 assert.equal(await first.mutate([{op:'set',path:[],value:{enabled:true,rules:[]}}],4),true);
 assert.deepEqual(second.getSnapshot().value,{enabled:true,rules:[]});
 assert.equal(second.getSnapshot().revision,5);
 assert.equal(await second.mutate([{op:'set',path:[],value:{enabled:false,rules:[]}}],4),false);
 assert.equal(requests.filter(r=>r.method==='PUT').length,1);
 assert.deepEqual(document.defaults,{enabled:true,rules:[]});
});

test('workspace reset removes only that override and unsafe workspace identities are refused',async()=>{
 let document:any={revision:1,defaults:{enabled:true,rules:[]},workspaceOverrides:{alpha:{enabled:false,rules:[]},beta:{enabled:true,rules:[{scope:'all',mode:'fixed',effort:'native-high'}]}}};
 const source=createSharedCompactionSource((async(_url,init:any={})=>{if(init.method==='PUT'){const candidate=JSON.parse(init.body);document={revision:2,defaults:candidate.defaults,workspaceOverrides:candidate.workspaceOverrides};}return new Response(JSON.stringify(document));}) as typeof fetch);
 await source.refresh('dsh-extras-model-policy');
 const alpha=source.form('alpha');
 assert.deepEqual(alpha.getSnapshot().value,{enabled:false,rules:[]});
 assert.equal(await alpha.mutate([{op:'unset',path:[]}],1),true);
 assert.equal(Object.hasOwn(document.workspaceOverrides,'alpha'),false);
 assert.deepEqual(document.workspaceOverrides.beta,{enabled:true,rules:[{scope:'all',mode:'fixed',effort:'native-high'}]});
 assert.deepEqual(alpha.getSnapshot().value,{enabled:true,rules:[]});
 assert.throws(()=>source.form('__proto__'),/workspace/i);
});

test('last settings lease cancels a pending read and its late response cannot activate the editor',async()=>{
 let release!:(value:Response)=>void;let signal:AbortSignal|undefined;
 const source=createSharedCompactionSource(((_url,init:any)=>{signal=init.signal;return new Promise<Response>(resolve=>{release=resolve;});}) as typeof fetch);
 const stop=source.start('dsh-extras');
 stop();
 assert.equal(signal?.aborted,true);
 release(new Response(JSON.stringify({revision:9,defaults:{enabled:true,rules:[]},workspaceOverrides:{}})));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(source.form().getSnapshot().writable,false);
 assert.notEqual(source.form().getSnapshot().revision,9);
});
