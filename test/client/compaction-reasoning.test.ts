import assert from 'node:assert/strict';
import test from 'node:test';
import { bindSection, type ConfigForm, type ConfigFormSnapshot, type PathOperation } from '../../client/forms.ts';
import { createReasoningEditor } from '../../client/reasoning.ts';

function nativeForm(policy: unknown = { enabled: false, rules: [] }) {
  let snapshot: ConfigFormSnapshot<any> = {status:'ready',writable:true,revision:7,value:{modules:{'compact-context':{enabled:true,compactTool:false,compactionReasoning:policy},retry:{enabled:true}}}};
  const listeners = new Set<() => void>();
  const writes: {ops: readonly PathOperation[]; revision?: number}[] = [];
  const update = (patch: Partial<ConfigFormSnapshot>) => {snapshot = {...snapshot,...patch}; for (const fn of listeners) fn();};
  const form: ConfigForm = {
    getSnapshot: () => snapshot,
    subscribe(fn) {listeners.add(fn); return () => {listeners.delete(fn);};},
    async mutate(ops,revision) {
      writes.push({ops,revision}); if(revision !== snapshot.revision) return false;
      const value = structuredClone(snapshot.value);
      for(const op of ops) {let target = value; for(const key of op.path.slice(0,-1)) target = target[key] ??= {}; const key = op.path.at(-1)!; if(op.op === 'set') target[key] = structuredClone(op.value); else delete target[key];}
      update({value,revision:revision!+1}); return true;
    },
  };
  return {form,writes,update,listeners,read:()=>snapshot};
}

test('native configForms saves the independent policy without enabling tools or replacing siblings', async () => {
  const native = nativeForm();
  const editor = createReasoningEditor(bindSection(native.form,['modules','compact-context','compactionReasoning']));
  const stop = editor.start();
  editor.setEnabled(true);
  assert.equal(await editor.save(),true);
  assert.deepEqual(native.read().value.modules['compact-context'],{enabled:true,compactTool:false,compactionReasoning:{enabled:true,rules:[]}});
  assert.deepEqual(native.read().value.modules.retry,{enabled:true});
  assert.equal(native.writes[0].revision,7);
  stop(); assert.equal(native.listeners.size,0);
});

test('native absent policy resolves disabled inherit defaults without writes', () => {
  const native = nativeForm(undefined);
  native.update({value:{modules:{'compact-context':{enabled:true,compactTool:false}}}});
  const editor = createReasoningEditor(bindSection(native.form,['modules','compact-context','compactionReasoning']));
  assert.deepEqual(editor.getSnapshot().value,{enabled:false,rules:[{scope:'all',mode:'inherit'}]});
  assert.equal(native.writes.length,0);
});

test('structured rules preserve exact IDs, clear inapplicable fields, reject duplicate targets and save explicit empty lists', async () => {
  const native = nativeForm();
  const editor = createReasoningEditor(bindSection(native.form,['modules','compact-context','compactionReasoning']));
  const stop = editor.start();
  editor.addRule();
  editor.updateRule(0,{scope:'provider-model'});
  editor.updateRule(0,{provider:'Route/A',model:'Model/Exact',mode:'fixed',effort:'Opaque:MAX/Case'});
  assert.equal(await editor.save(),true);
  assert.deepEqual(native.read().value.modules['compact-context'].compactionReasoning.rules,[{scope:'provider-model',provider:'Route/A',model:'Model/Exact',mode:'fixed',effort:'Opaque:MAX/Case'}]);
  editor.updateRule(0,{scope:'provider',mode:'inherit'});
  assert.deepEqual(editor.getSnapshot().value.rules,[{scope:'provider',provider:'Route/A',mode:'inherit'}]);
  editor.addRule(); editor.updateRule(1,{scope:'provider',provider:'Route/A'});
  assert.equal(await editor.save(),false);
  assert.match(editor.getSnapshot().error,/duplicate/);
  assert.equal(native.writes.length,1);
  editor.removeRule(1);editor.removeRule(0);
  assert.equal(await editor.save(),true);
  assert.deepEqual(native.read().value.modules['compact-context'].compactionReasoning.rules,[]);
  stop();
});

test('native reset removes only the policy override and obeys loading and read-only states', async () => {
  const native = nativeForm({enabled:true,rules:[]});
  const editor = createReasoningEditor(bindSection(native.form,['modules','compact-context','compactionReasoning']));
  const stop = editor.start();
  native.update({status:'loading'});
  assert.equal(await editor.reset(),false);
  native.update({status:'ready',writable:false});
  assert.equal(await editor.reset(),false);
  native.update({writable:true});
  assert.equal(await editor.reset(),true);
  assert.deepEqual(native.writes[0],{revision:7,ops:[{op:'unset',path:['modules','compact-context','compactionReasoning']}]});
  assert.deepEqual(editor.getSnapshot().value,{enabled:false,rules:[{scope:'all',mode:'inherit'}]});
  assert.equal(native.read().value.modules['compact-context'].compactTool,false);
  stop();
});

test('pending native writes are single-flight and cannot publish after editor cleanup', async () => {
  const native = nativeForm();
  let resolve!: (value:boolean) => void;
  let calls=0;
  const form: ConfigForm = {...native.form,mutate: async () => {calls++;return new Promise<boolean>(done=>{resolve=done;});}};
  const editor=createReasoningEditor(bindSection(form,['modules','compact-context','compactionReasoning']));
  const stop=editor.start();editor.setEnabled(true);
  const pending=editor.save();
  assert.equal(editor.getSnapshot().saving,true);
  assert.equal(await editor.save(),false);assert.equal(calls,1);
  let notifications=0;const off=editor.subscribe(()=>{notifications++;});
  stop();const stopped=editor.getSnapshot();
  resolve(true);assert.equal(await pending,false);
  assert.equal(editor.getSnapshot(),stopped);assert.equal(notifications,0);
  assert.equal(native.listeners.size,0);off();
});

test('native sibling revisions preserve a dirty policy until explicit discard', async () => {
  const native = nativeForm();
  const editor = createReasoningEditor(bindSection(native.form,['modules','compact-context','compactionReasoning']));
  const stop = editor.start();
  editor.setEnabled(true);
  await bindSection(native.form,['modules','retry']).mutate([{op:'set',path:['enabled'],value:false}],7);
  assert.equal(editor.getSnapshot().value.enabled,true);
  assert.equal(editor.getSnapshot().conflict,true);
  assert.equal(await editor.save(),false);
  assert.equal(native.writes.length,1);
  editor.discard();
  assert.equal(editor.getSnapshot().value.enabled,false);
  assert.equal(editor.getSnapshot().revision,8);
  assert.equal(editor.getSnapshot().conflict,false);
  stop();
});
