import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelPolicyEditor} from '../../client/model-policy-settings.ts';

test('native form scopes stage drafts and conflict instead of rebasing expectedRevision',async()=>{
 let snapshot:any={status:'ready',writable:true,revision:4,value:{root:{provider:'p',model:'m'},descendants:null,workspaceOverrides:[]}};
 const listeners=new Set<()=>void>();const writes:any[]=[];
 const form={getSnapshot:()=>snapshot,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>listeners.delete(fn);},mutate:async(ops:any,revision:any)=>{writes.push({ops,revision});return true;}};
 const editor=createModelPolicyEditor(form);const stop=editor.start();
 editor.setSelection('root',{provider:'x',model:'y'},'workspace-a');assert.equal(writes.length,0);
 snapshot={...snapshot,revision:5};for(const listener of listeners)listener();
 assert.equal(editor.getSnapshot().conflict,true);assert.equal(await editor.save(),false);assert.equal(writes.length,0);
 editor.discard();editor.setSelection('root',null,'workspace-a');assert.equal(await editor.save(),true);
 assert.equal(writes[0].revision,5);assert.deepEqual(writes[0].ops.find((op:any)=>op.path[0]==='workspaceOverrides').value,[{workspaceId:'workspace-a',root:null}]);
 editor.discard();editor.resetScope('workspace-a');assert.equal(writes.length,1);stop();
});

test('reset global scope stages native unset operations without discarding inherited base',async()=>{
 const writes:any[]=[];const form:any={getSnapshot:()=>({status:'ready',writable:true,revision:7,value:{root:{provider:'user',model:'m'}},base:{root:{provider:'base',model:'inherited'}}}),subscribe:()=>()=>{},mutate:async(ops:any,revision:any)=>{writes.push({ops,revision});return true;}};
 const editor=createModelPolicyEditor(form);const stop=editor.start();editor.resetScope();assert.equal(writes.length,0);await editor.save();
 assert.deepEqual(writes[0].ops.filter((op:any)=>op.op==='unset').map((op:any)=>op.path),[['root'],['descendants']]);stop();
});

test('restoring the last inherited model role removes only its empty workspace override',async()=>{
 const value={root:{provider:'global',model:'base'},descendants:null,workspaceOverrides:[{workspaceId:'a',root:{provider:'custom',model:'a'}},{workspaceId:'b',root:null}]};const writes:any[]=[];
 const form:any={getSnapshot:()=>({status:'ready',writable:true,revision:9,value}),subscribe:()=>()=>{},mutate:async(ops:any)=>{writes.push(ops);return true;}};const editor=createModelPolicyEditor(form);const stop=editor.start();editor.setSelection('root',undefined,'a');await editor.save();assert.deepEqual(writes[0],[{op:'set',path:['workspaceOverrides'],value:[{workspaceId:'b',root:null}]}]);stop();
});

test('invalid workspace targets never fall back to global and a dirty draft cannot change scope',async()=>{
 const value={root:{provider:'global',model:'keep-root'},descendants:{provider:'global',model:'keep-child'},workspaceOverrides:[]};const writes:any[]=[];
 const form:any={getSnapshot:()=>({status:'ready',writable:true,revision:8,value}),subscribe:()=>()=>{},mutate:async(ops:any,revision:any)=>{writes.push({ops,revision});return true;}};
 const editor=createModelPolicyEditor(form);const stop=editor.start();
 for(const id of ['', '   ', 'bad\u0001id', 'x'.repeat(201)]) {editor.setSelection('root',{provider:'wrong',model:'wrong'},id);editor.resetScope(id);assert.equal(editor.getSnapshot().dirty,false);assert.deepEqual(editor.getSnapshot().value.root,value.root);assert.equal(await editor.save(),false);}
 assert.equal(writes.length,0);
 editor.setSelection('root',{provider:'workspace',model:'only-here'},'workspace-a');
 editor.setSelection('root',{provider:'wrong',model:'global-overwrite'});editor.resetScope('workspace-b');
 assert.deepEqual(editor.getSnapshot().value.root,value.root);assert.deepEqual(editor.getSnapshot().value.workspaceOverrides,[{workspaceId:'workspace-a',root:{provider:'workspace',model:'only-here'}}]);
 assert.equal(await editor.save(),true);assert.deepEqual(writes[0],{revision:8,ops:[{op:'set',path:['workspaceOverrides'],value:[{workspaceId:'workspace-a',root:{provider:'workspace',model:'only-here'}}]}]});
 editor.discard();editor.setSelection('root',{provider:'global',model:'allowed'});assert.equal(editor.getSnapshot().value.root?.model,'allowed');stop();
});
