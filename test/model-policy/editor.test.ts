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
