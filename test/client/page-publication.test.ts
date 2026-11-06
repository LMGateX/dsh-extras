import assert from 'node:assert/strict';
import test from 'node:test';
import { bindSection, createPageFormAdapter, type ConfigFormSnapshot, type PathOperation } from '../../client/forms.ts';
import { createReasoningEditor } from '../../client/reasoning.ts';

/** Native acceptance is immediate; the page-owned React snapshot publishes explicitly later. */
function delayedPage() {
  let accepted: ConfigFormSnapshot<any> = {status:'ready', writable:true, revision:7, value:{modules:{'compact-context':{compactionReasoning:{enabled:false,rules:[]}},retry:{enabled:true}}},user:{modules:{'compact-context':{compactionReasoning:{enabled:false,rules:[]}},retry:{enabled:true}}}};
  const pageState = accepted;
  const listeners = new Set<() => void>();
  const writes: {ops:readonly PathOperation[]; revision?:number}[] = [];
  const mutate = async (ops: readonly PathOperation[], revision?: number) => {
    writes.push({ops,revision});
    if (revision !== accepted.revision) return false;
    const value = structuredClone(accepted.value);
    for (const op of ops) {
      let target = value; for (const key of op.path.slice(0,-1)) target = target[key] ??= {};
      const key = op.path.at(-1)!; if (op.op === 'unset') delete target[key]; else target[key] = structuredClone(op.value);
    }
    accepted = {...accepted, value, user:structuredClone(value), revision:accepted.revision!+1};
    for (const listener of listeners) listener();
    return true;
  };
  const authority = {getSnapshot:()=>accepted,subscribe(listener:()=>void) {listeners.add(listener);return ()=>{listeners.delete(listener);};}};
  const adapter = createPageFormAdapter({state:pageState,mutate},authority);
  return {adapter,writes,listeners,pageState,publish:()=>adapter.update({state:accepted,mutate})};
}

test('native page siblings share a wire-call fence and use accepted native revisions before delayed page props', async () => {
  const native = delayedPage();
  const policy = createReasoningEditor(bindSection(native.adapter,['modules','compact-context','compactionReasoning']));
  const sibling = bindSection(native.adapter,['modules','retry']);
  const stop = policy.start();
  policy.setEnabled(true);
  const saving = policy.save();
  assert.equal(sibling.getSnapshot().writable,false,'all siblings must be fenced while one native mutation crosses the wire');
  assert.equal(await sibling.mutate([{op:'set',path:['enabled'],value:false}],7),false);
  assert.equal(native.writes.length,1,'the old revision must not reach the native mutation endpoint');
  assert.equal(await saving,true);
  assert.equal(native.pageState.revision,7,'native page props are deliberately still old');
  assert.equal(policy.getSnapshot().saving,false);
  assert.equal(sibling.getSnapshot().revision,8);
  assert.equal(sibling.getSnapshot().writable,true);
  assert.equal(await sibling.mutate([{op:'set',path:['enabled'],value:false}],7),false,'explicit old read remains refused, never rebased');
  assert.equal(native.writes.length,1);
  assert.equal(await sibling.mutate([{op:'set',path:['enabled'],value:false}],8),true);
  assert.equal(native.writes[1].revision,8);
  stop();assert.equal(native.listeners.size,0);
});

test('native canonical reads never bypass page permission barriers and mounted subscriptions detach and reattach', async () => {
  const state: ConfigFormSnapshot={status:'ready',writable:true,revision:8,value:{enabled:true}};
  const listeners=new Set<()=>void>();let writes=0;
  const authority={getSnapshot:()=>state,subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}};
  const mutate=async()=>{writes++;return true;};
  const adapter=createPageFormAdapter({state:{...state,revision:7,writable:false},mutate},authority);
  const off=adapter.subscribe(()=>{});assert.equal(listeners.size,1);off();assert.equal(listeners.size,0);
  const remount=adapter.subscribe(()=>{});assert.equal(listeners.size,1);
  for(const patch of [{writable:false},{status:'loading' as const},{status:'unavailable' as const},{revision:undefined}]) {
    adapter.update({state:{...state,...patch},mutate});
    assert.equal(adapter.getSnapshot().writable,false);
    assert.equal(await adapter.mutate([{op:'set',path:['enabled'],value:false}],8),false);
  }
  assert.equal(writes,0);
  adapter.update({state:{...state,revision:7},mutate});
  assert.equal(adapter.getSnapshot().revision,8,'an older ready page frame cannot roll back accepted native state');
  assert.equal(await adapter.mutate([{op:'set',path:['enabled'],value:true}],8),true);
  assert.equal(writes,1);remount();assert.equal(listeners.size,0);
});

test('native true no-op keeps the exact revision and releases siblings without waiting for new props', async () => {
  const state: ConfigFormSnapshot = {status:'ready',writable:true,revision:7,value:{enabled:true,rules:[]},user:{enabled:true,rules:[]}};
  let calls=0;
  const authority = {getSnapshot:()=>state,subscribe:()=>()=>{},mutate:()=>{throw new Error('read-only authority must never write');}};
  const adapter = createPageFormAdapter({state,mutate:async (_ops,revision)=>{calls++;assert.equal(revision,7);return true;}},authority);
  const policy=createReasoningEditor(adapter);const stop=policy.start();
  policy.setEnabled(true);const pending=policy.save();
  assert.equal(adapter.getSnapshot().writable,false);
  assert.equal(await pending,true);
  assert.equal(adapter.getSnapshot(),state);
  assert.equal(adapter.getSnapshot().revision,7);
  assert.equal(policy.getSnapshot().saving,false);assert.equal(policy.getSnapshot().dirty,false);
  assert.equal(await adapter.mutate([{op:'set',path:['enabled'],value:true}],8),false);
  assert.equal(calls,1,'explicit mismatched revision is not rebased or sent through another endpoint');stop();
});
