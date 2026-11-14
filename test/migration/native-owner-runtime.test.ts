import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectMigration, dryRunMigration } from '../../src/migration/index.ts';
import type { NativeMigrationHost } from '../../src/migration/types.ts';

const anchor = process.env.DSH_TEST_INSTALL_ANCHOR ?? createRequire(import.meta.url).resolve('@deepseek-ai/dsh/package.json');
const hostRequire = createRequire(anchor);
const load = (name: string) => import(pathToFileURL(hostRequire.resolve(name)).href);
const target = {rowId:'dsh-extras',packageName:'dsh-extras',moduleIds:['goalWait'] as const};

async function nativeProofFixture(t: TestContext, loaderProof?: {version?: string; foreignClass?: boolean}) {
  const root = await mkdtemp(join(tmpdir(), 'ex-owner-artifact-'));
  t.after(async () => { assert.ok(root.startsWith(join(tmpdir(), 'ex-owner-artifact-'))); await rm(root, {recursive:true,force:true}); });
  const dir = join(root, 'profile'), home = join(root, 'home');
  await mkdir(dir); await mkdir(home);
  await writeFile(join(dir, 'package.json'), JSON.stringify({name:'native-proof-fixture',dsh:{profile:{bundles:[]}}}));
  const patchPath = join(dir, 'cordis.patch.yml');
  await writeFile(patchPath, JSON.stringify([{insert:[{id:'goal-round-driver',name:'@deepseek-ai/dsh-goal-round-driver'},{id:'dsh-extras',name:'dsh-extras'}]}]));
  const {createRuntime} = await import('../modules/retry/runtime.ts');
  const runtime = await createRuntime({product:false,retry:false});
  t.after(() => runtime.dispose());
  const {ctx} = runtime;
  await ctx.plugin((await load('@deepseek-ai/dsh-goal')).default).await();
  await ctx.plugin((await load('@deepseek-ai/cordis-plugin-loader')).default, {baseUrl:pathToFileURL(anchor).href}).await();
  await ctx.loader.create({id:'goal-round-driver',name:'@deepseek-ai/dsh-goal-round-driver'}); await ctx.loader.await();
  const stock = ctx.loader.resolve('goal-round-driver');
  assert.equal(stock.fiber.state, 2);
  const host: NativeMigrationHost = {profileContext:{dir,home,patchPath,installAnchor:anchor},loader:ctx.loader,continuationContext:ctx,nativeMigration:await load('@deepseek-ai/dsh-app-boot')};
  const inspect = () => inspectMigration(host, {...target,moduleIds:[...target.moduleIds]});
  assert.deepEqual((await inspect()).goalOwner, {verified:true,stockActive:true});
  const fakeAnchor = join(root, 'anchor', 'package.json');
  const scope = join(dirname(fakeAnchor), 'node_modules', '@deepseek-ai');
  await mkdir(scope, {recursive:true});
  await writeFile(fakeAnchor, JSON.stringify({name:'standalone-proof-anchor',type:'module'}));
  await symlink(dirname(hostRequire.resolve('@deepseek-ai/cordis/package.json')),join(scope,'cordis'),'dir');
  const loaderDir = join(scope,'cordis-plugin-loader');
  if (!loaderProof) await symlink(dirname(hostRequire.resolve('@deepseek-ai/cordis-plugin-loader/package.json')),loaderDir,'dir');
  else if (loaderProof.version) {
    await mkdir(loaderDir);
    await writeFile(join(loaderDir,'package.json'),JSON.stringify({name:'@deepseek-ai/cordis-plugin-loader',version:loaderProof.version,type:'module',exports:{'.':'./index.js','./package.json':'./package.json'}}));
    await writeFile(join(loaderDir,'index.js'),loaderProof.foreignClass ? 'export default class Loader {}' : 'export {default} from '+JSON.stringify(pathToFileURL(hostRequire.resolve('@deepseek-ai/cordis-plugin-loader')).href)+';');
  }
  const driverDir = join(scope, 'dsh-goal-round-driver');
  if (loaderProof) await symlink(dirname(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver/package.json')),driverDir,'dir');
  else await mkdir(driverDir);
  return {root,ctx,stock,host,inspect,fakeAnchor,scope,driverDir,patchPath};
}

for (const version of ['0.2.2-rc.1', '0.2.2-rc.2', '99.0.0']) test('public inspection refuses historical or unknown anchored driver '+version+' despite an exact live native Loader tuple', async t => {
  const f = await nativeProofFixture(t);
  await writeFile(join(f.driverDir,'package.json'), JSON.stringify({name:'@deepseek-ai/dsh-goal-round-driver',version,type:'module',exports:{'.':'./index.js','./package.json':'./package.json'}}));
  await writeFile(join(f.driverDir,'index.js'), 'export * from '+JSON.stringify(pathToFileURL(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver')).href)+';');
  f.host.profileContext.installAnchor = f.fakeAnchor;
  const denied = (await f.inspect()).goalOwner;
  assert.equal(denied?.verified,false); assert.equal(denied?.stockActive,false);
  assert.match(denied?.reason ?? '', /unsupported anchored native driver version/);
  const plan = await dryRunMigration(f.host,{...target,moduleIds:[...target.moduleIds]});
  assert.equal(plan.decisions[0]?.phase,'conflict','unverified artifact proof cannot authorize migration admission');
  assert.equal(plan.decisions[0]?.enabled,false);
  assert.equal(f.stock.fiber.state,2);
  assert.equal(f.stock.options.disabled,undefined);
});

test('public inspection rejects changed rc driver bytes before evaluating an identity-preserving replacement module', async t => {
  const f = await nativeProofFixture(t);
  await writeFile(join(f.driverDir,'package.json'), JSON.stringify({name:'@deepseek-ai/dsh-goal-round-driver',version:'0.2.2-rc.3',type:'module',exports:{'.':'./index.js','./package.json':'./package.json'}}));
  const marker = Symbol.for('dsh-extras.test.unverified-driver-evaluated');
  const globals = globalThis as unknown as Record<symbol, unknown>;
  delete globals[marker]; t.after(() => {delete globals[marker];});
  await writeFile(join(f.driverDir,'index.js'), 'globalThis[Symbol.for("dsh-extras.test.unverified-driver-evaluated")]=true;export * from '+JSON.stringify(pathToFileURL(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver')).href)+';');
  f.host.profileContext.installAnchor = f.fakeAnchor;
  const denied = (await f.inspect()).goalOwner;
  assert.equal(denied?.verified,false); assert.equal(denied?.stockActive,false);
  assert.match(denied?.reason ?? '', /anchored native driver.*fingerprint/);
  assert.equal(globals[marker],undefined,'unverified executable must not be imported just to obtain its callback');
  assert.equal(f.stock.fiber.state,2); assert.equal(f.stock.options.disabled,undefined);
});

test('public inspection refuses missing, historical or foreign anchored Loader proof despite an exact native tuple', async t => {
  for (const proof of [{}, {version:'1.0.7-alpha.2'}, {version:'99.0.0'}, {version:'1.1.0',foreignClass:true}]) await t.test(JSON.stringify(proof), async t => {
    const f = await nativeProofFixture(t,proof);
    f.host.profileContext.installAnchor = f.fakeAnchor;
    const denied = (await f.inspect()).goalOwner;
    assert.equal(denied?.verified,false); assert.equal(denied?.stockActive,false);
    assert.match(denied?.reason ?? '', /anchored.*Loader/);
    assert.equal(f.stock.fiber.state,2); assert.equal(f.stock.options.disabled,undefined);
  });
});

test('public inspection accepts the exact rc Cordis root and refuses historical or unknown anchored versions', async t => {
  assert.equal(hostRequire('@deepseek-ai/dsh/package.json').version, '0.2.2-rc.3');
  assert.equal(hostRequire('@deepseek-ai/cordis/package.json').version, '4.1.0');
  const root = await mkdtemp(join(tmpdir(), 'ex-owner-rc-'));
  t.after(async () => { assert.ok(root.startsWith(join(tmpdir(), 'ex-owner-rc-'))); await rm(root, {recursive:true,force:true}); });
  const dir = join(root, 'profile'), home = join(root, 'home');
  await mkdir(dir, {recursive:true}); await mkdir(home, {recursive:true});
  await writeFile(join(dir, 'package.json'), JSON.stringify({name:'owner-rc-fixture',dsh:{profile:{bundles:[]}}}));
  await writeFile(join(dir, 'cordis.patch.yml'), JSON.stringify([{insert:[{id:'dsh-extras',name:'dsh-extras'}]}]));
  const {Context} = await load('@deepseek-ai/cordis');
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  const host: NativeMigrationHost = {
    profileContext:{dir,home,patchPath:join(dir,'cordis.patch.yml'),installAnchor:anchor},
    loader:{entries:()=>[]}, continuationContext:ctx,
    nativeMigration:await load('@deepseek-ai/dsh-app-boot'),
  };
  assert.deepEqual((await inspectMigration(host, {...target,moduleIds:[...target.moduleIds]})).goalOwner, {verified:true,stockActive:false}, 'a genuine empty root is verified absence, not an active stock grant');
  for (const version of ['4.0.6-alpha.2', '99.0.0']) {
    const shadow = join(root, version, 'package.json');
    const cordisDir = join(dirname(shadow), 'node_modules', '@deepseek-ai', 'cordis');
    await mkdir(cordisDir, {recursive:true});
    await writeFile(shadow, JSON.stringify({name:'shadow-host',type:'module'}));
    await writeFile(join(cordisDir, 'package.json'), JSON.stringify({name:'@deepseek-ai/cordis',version,exports:{'./package.json':'./package.json'}}));
    host.profileContext.installAnchor = shadow;
    const denied = (await inspectMigration(host, {...target,moduleIds:[...target.moduleIds]})).goalOwner;
    assert.equal(denied?.verified, false); assert.equal(denied?.stockActive, false);
    assert.match(denied?.reason ?? '', /unsupported anchored Cordis version/);
  }
});

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
