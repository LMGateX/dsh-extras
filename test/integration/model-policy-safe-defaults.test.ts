import test from 'node:test';
import assert from 'node:assert/strict';
import {Config} from '../../src/index.ts';
import * as compactContext from '../../src/modules/compact-context/index.ts';
import * as modelPolicy from '../../src/modules/model-policy/index.ts';
import type {Distribution} from '../../src/types.ts';
import {loaderFixture, until} from './loader-harness.ts';

test('combined upgrades omit model policy safely while preserving original module defaults', () => {
  const config = Config({}) as any;
  for (const id of ['compact-context','retry','chime','goalWait']) assert.equal(config.modules[id].enabled.get(),true);
  assert.equal(config.modules['model-policy'].enabled.get(),false);
  // Native Schemastery omits null defaults. Public feature resolution supplies inherit semantics.
  const resolved = modelPolicy.resolveConfig(config.modules['model-policy']);
  assert.equal(resolved.root,null);
  assert.equal(resolved.descendants,null);
  assert.deepEqual(config.modules['model-policy'].workspaceOverrides.get(),[]);
  assert.equal(config.modules['model-policy'].compactionReasoning.get().enabled,false);
});

test('native migration admission accepts defaulted policy input without losing explicit empty rule semantics', {timeout:10000}, async t => {
  const distribution: Distribution = {name:'dsh-extras-compact-context',moduleIds:['compact-context'],modulePlugins:{'compact-context':compactContext}};
  const f = await loaderFixture(t,distribution,{modules:{'compact-context':{enabled:true,compactTool:false,compactionReasoning:{enabled:false}}},migration:{auto:false}});
  await f.ready();
  assert.equal(f.status().modules['compact-context'].ready,true);
  await f.update({modules:{'compact-context':{enabled:true,compactTool:false,compactionReasoning:{enabled:false,rules:[]}}},migration:{auto:false}});
  await until(() => f.status(), value => value.modules['compact-context'].ready===true,'explicit empty policy adopted');
});

test('native root exposes selected settings while default-off model feature stays unmounted until explicit enable', {timeout:10000}, async t => {
  let mounts = 0;
  let active = 0;
  let admitted = () => false;
  const feature = {...modelPolicy,
    mountSettings(_ctx:unknown, distribution:string, isActive?:()=>boolean) { assert.equal(distribution,'dsh-extras-model-policy'); admitted=isActive??(()=>false); mounts++; },
    apply(ctx:any) { active++; ctx.effect(() => () => { active--; }); }
  };
  const distribution: Distribution = {name:'dsh-extras-model-policy',moduleIds:['model-policy'],modulePlugins:{'model-policy':feature}};
  const f = await loaderFixture(t,distribution,{migration:{auto:false}});
  await f.ready();
  assert.equal(mounts,1);
  assert.equal(active,0);
  assert.equal(f.status().modules['model-policy'].enabled,false);
  assert.equal(f.status().modules['model-policy'].phase,'disabled');
  await f.update({modules:{'model-policy':{enabled:true}},migration:{auto:false}});
  await until(() => f.status(), value => value.modules['model-policy'].phase === 'active','model explicit enable');
  assert.equal(active,1);
  assert.equal(admitted(),true,'operation admission follows actual active native fiber');
  assert.equal(mounts,1,'volatile opt-in retains selected settings surface');
  await f.update({modules:{'model-policy':{enabled:false}},migration:{auto:false}});
  await until(() => f.status(), value => value.modules['model-policy'].phase === 'disabled','model disable');
  assert.equal(active,0);
  assert.equal(admitted(),false,'disabled module revokes operation admission');
  await f.dispose();
  assert.equal(admitted(),false,'disposed root revokes captured admission getter');
});
