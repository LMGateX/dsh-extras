import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectMigration } from '../../src/migration/index.ts';
import type { NativeMigrationHost } from '../../src/migration/types.ts';

const anchor = process.env.DSH_TEST_INSTALL_ANCHOR ?? createRequire(import.meta.url).resolve('@deepseek-ai/dsh/package.json');
const hostRequire = createRequire(anchor);
const load = (name: string) => import(pathToFileURL(hostRequire.resolve(name)).href);
const target = {rowId:'dsh-extras',packageName:'dsh-extras',moduleIds:['goalWait'] as const};

test('public inspection refuses unavailable anchored Cordis even with a genuine Context and native callback', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ex-owner-runtime-'));
  t.after(async () => { assert.ok(root.startsWith(join(tmpdir(), 'ex-owner-runtime-'))); await rm(root, {recursive:true,force:true}); });
  const dir = join(root, 'profile'), home = join(root, 'home');
  await mkdir(dir, {recursive:true}); await mkdir(home, {recursive:true});
  await writeFile(join(dir, 'package.json'), JSON.stringify({name:'owner-fixture',dsh:{profile:{bundles:[]}}}));
  await writeFile(join(dir, 'cordis.patch.yml'), JSON.stringify([{insert:[{id:'dsh-extras',name:'dsh-extras'}]}]));
  const {Context} = await load('@deepseek-ai/cordis');
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  const emptyAnchor = join(root, 'incomplete-host', 'package.json');
  await mkdir(dirname(emptyAnchor), {recursive:true});
  await writeFile(emptyAnchor, JSON.stringify({name:'incomplete-host',type:'module'}));
  const driverDir = join(dirname(emptyAnchor), 'node_modules', '@deepseek-ai', 'dsh-goal-round-driver');
  await mkdir(dirname(driverDir), {recursive:true});
  await symlink(dirname(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver/package.json')), driverDir, 'dir');
  // Discovery uses the actual audited read-only facade so this public call reaches
  // runtime proof even when the deliberately incomplete anchor has no app-boot.
  const host: NativeMigrationHost & {nativeMigration: unknown} = {
    profileContext:{dir,home,patchPath:join(dir,'cordis.patch.yml'),installAnchor:emptyAnchor},
    loader:{entries:()=>[]}, continuationContext:ctx,
    nativeMigration:await load('@deepseek-ai/dsh-app-boot'),
  };
  const input = await inspectMigration(host, {...target,moduleIds:[...target.moduleIds]});
  assert.equal(input.goalOwner?.verified, false);
  assert.equal(input.goalOwner?.stockActive, false);
  assert.match(input.goalOwner?.reason ?? '', /anchored.*Cordis|Cordis.*anchor/);
});
