import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveConfig, validateConfig, selectionFor} from '../../src/modules/model-policy/config.ts';

test('safe defaults and workspace omitted versus explicit native selection', () => {
  assert.equal(resolveConfig({}).enabled, false);
  assert.equal(resolveConfig({}).root, null);
  const root = {provider:'exact-provider',model:'model/id',reasoningEffort:null};
  const value = resolveConfig({root,descendants:{provider:'child',model:'m'},workspaceOverrides:[{workspaceId:'a',root:null},{workspaceId:'b'}]});
  validateConfig(value);
  assert.equal(selectionFor(value,'a',false),null);
  assert.deepEqual(selectionFor(value,'b',false),{provider:'exact-provider',model:'model/id'});
  assert.deepEqual(selectionFor(value,'a',true),{provider:'child',model:'m'});
});
