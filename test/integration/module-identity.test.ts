/** Public configuration identities; native Context/tool vocabulary is intentionally unchanged. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Config } from '../../src/index.ts';
import * as compactContext from '../../src/modules/compact-context/index.ts';
import { plain, validateModule } from '../../src/config.ts';
import { MODULE_IDS, type ModuleId } from '../../src/types.ts';
import { MODULE_IDS as migrationIds, type ModuleId as MigrationId } from '../../src/migration/types.ts';
import { validateModuleConfig } from '../../src/migration/validation.ts';
import { migrationMain } from '../../src/migration/cli.ts';
import type { ModuleId as ClientId } from '../../client/settings.ts';

// Compile-time gates: the development-only id must not remain in any public union.
type Assert<T extends true> = T;
type NoOldId = Assert<'context' extends ModuleId | MigrationId | ClientId ? false : true>;
type NewIdEverywhere = Assert<'compact-context' extends ModuleId & MigrationId & ClientId ? true : false>;

test('combined native schema and public ids expose compact-context without a context alias', () => {
  assert.deepEqual(MODULE_IDS, ['compact-context', 'retry', 'chime', 'goalWait', 'model-policy']);
  assert.deepEqual(migrationIds, MODULE_IDS);
  assert.equal(compactContext.name, 'extras-compact-context');
  assert.deepEqual(Object.keys((Config as any).dict.modules.dict), [...MODULE_IDS]);
  const input = { modules: { context: { enabled: false, retryAttempts: 5 }, 'compact-context': { enabled: false, retryAttempts: 0 } } };
  const before = structuredClone(input);
  const values = plain<any>((Config as any)(input));
  assert.equal(values.modules['compact-context'].enabled, false);
  assert.equal(values.modules['compact-context'].retryAttempts, 0);
  assert.equal(plain<any>((Config as any)({ modules: { context: { enabled: false } } })).modules['compact-context'].enabled, true, 'old fields are not imported or used as defaults');
  assert.deepEqual(input, before, 'no automatic configuration rewrite');
});

test('preflight and CLI refuse the removed module id rather than translating it', async () => {
  const distribution = { name: 'dsh-extras', moduleIds: MODULE_IDS, modulePlugins: { 'compact-context': compactContext } };
  assert.doesNotThrow(() => validateModule(distribution, 'compact-context', { enabled: false, retryAttempts: 0 }));
  assert.throws(() => validateModule(distribution, 'context' as ModuleId, {}), /Unsupported module/);
  assert.throws(() => validateModuleConfig('context' as MigrationId, {}));
  await assert.rejects(migrationMain(['rollback', '--profile-dir', '/unused-profile', '--dsh-home', '/unused-home', '--install-anchor', '/unused-package.json', '--operation', 'unused', '--modules', 'context']), /invalid rollback module/);
});
