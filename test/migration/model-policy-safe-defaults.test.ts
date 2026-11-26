import test from 'node:test';
import assert from 'node:assert/strict';
import { planMigration, LEGACY_DEFAULTS, LEGACY_PACKAGES } from '../../src/migration/planner.ts';
import type { Discovery } from '../../src/migration/types.ts';

function snapshot(legacyMode = false): Discovery {
  return {profileId:'fixture', profile:{dir:'/disposable/profile',patchPath:'/disposable/profile/cordis.patch.yml',home:'/disposable/home',installAnchor:'/disposable/dsh/package.json',overlayPaths:[]},revision:'one',manifest:{},patchText:'[]',manifestText:'{}',rows:[],sources:[],target:{rowId:'dsh-extras-model-policy',moduleIds:['model-policy']},explicit:{},peers:{},problems:[],legacyMode};
}
test('new capabilities remain off without invented predecessors on fresh and legacy upgrades', () => {
  for (const id of ['model-policy', 'host-timezone'] as const) {
    for (const legacyMode of [false, true]) {
      const input = snapshot(legacyMode);
      input.target = {rowId:'dsh-extras-' + id,moduleIds:[id]};
      const decision = planMigration(input).decisions[0];
      assert.equal(decision.phase, 'fresh', id);
      assert.equal(decision.enabled, false, id);
      assert.deepEqual(decision.config, {enabled:false});
      input.explicit[id] = {enabled:true};
      const enabled = planMigration(input).decisions[0];
      assert.equal(enabled.phase, 'fresh', id);
      assert.deepEqual(enabled.config, {enabled:true});
      input.explicit[id] = {enabled:'yes'};
      assert.equal(planMigration(input).decisions[0].phase,'conflict');
    }
    assert.equal(Object.hasOwn(LEGACY_DEFAULTS, id), false);
    assert.equal(Object.hasOwn(LEGACY_PACKAGES, id), false);
  }
});

test('explicit model-policy enable and exact selections survive an upgrade without legacy defaults', () => {
  const input = snapshot(true);
  input.explicit['model-policy'] = {enabled:true, root:{provider:'native',model:'exact',reasoningEffort:'opaque'},descendants:null,workspaceOverrides:[],compactionReasoning:{enabled:false,rules:[]}};
  const decision = planMigration(input).decisions[0];
  assert.equal(decision.phase, 'fresh');
  assert.equal(decision.enabled, true);
  assert.deepEqual(decision.config, input.explicit['model-policy']);
});

test('invalid new policy input fails closed locally without inventing a predecessor', () => {
  for (const fields of [{enabled:'yes'},{root:{provider:'native'}},{root:{provider:'native',model:'exact',reasoningEffort:3}},{workspaceOverrides:[{workspaceId:'same'},{workspaceId:'same'}]},{workspaceOverrides:[{workspaceId:'id',root:{provider:'native'}}]},{compactionReasoning:{enabled:true,rules:[{scope:'all',mode:'fixed'}]}}]) {
    const input = snapshot();
    input.explicit['model-policy'] = fields;
    const decision = planMigration(input).decisions[0];
    assert.equal(decision.phase,'conflict',JSON.stringify(fields));
    assert.equal(decision.enabled,false);
    assert.equal(decision.source,undefined);
  }
});

test('native null reasoning effort and exact opaque IDs survive migration unchanged', () => {
  const input = snapshot();
  input.explicit['model-policy']={root:{provider:'Native Provider',model:'exact/model',reasoningEffort:null},workspaceOverrides:[{workspaceId:'native registry',descendants:null}],compactionReasoning:{rules:[]}};
  const decision = planMigration(input).decisions[0];
  assert.equal(decision.phase,'fresh');
  assert.deepEqual(decision.config,{enabled:false,...input.explicit['model-policy']});
});
