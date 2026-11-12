import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, cp, rm, readFile, realpath, stat, writeFile, symlink, readdir, rename} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = resolve(import.meta.dirname, '../..');
const cli = join(root, 'scripts/native-host.mjs');
const modules = await realpath(join(root, 'node_modules'));
const owner = dirname(modules);
const driverHash = '8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c';
const json = async path => JSON.parse(await readFile(path, 'utf8'));

async function consumer(run) {
  const sandbox = await mkdtemp(join(tmpdir(), 'extras-npm-check-'));
  const env = {...process.env, HOME:join(sandbox,'home'), DSH_HOME:join(sandbox,'dsh'), DSH_PROFILE:'isolated', XDG_CONFIG_HOME:join(sandbox,'config'), XDG_CACHE_HOME:join(sandbox,'cache'), XDG_DATA_HOME:join(sandbox,'data'), XDG_STATE_HOME:join(sandbox,'state'), XDG_RUNTIME_DIR:join(sandbox,'runtime'), TMPDIR:join(sandbox,'tmp'), npm_config_cache:join(sandbox,'npm')};
  delete env.DSH_RUNTIME_ROOT; delete env.DSH_TEST_INSTALL_ANCHOR;
  for (const key of ['HOME','DSH_HOME','XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME','XDG_STATE_HOME','XDG_RUNTIME_DIR','TMPDIR','npm_config_cache']) await mkdir(env[key], {recursive:true});
  const cwd = join(sandbox, 'consumer'); await mkdir(cwd);
  await cp(join(root, 'package.json'), join(cwd, 'package.json'));
  const invoke = (at = cwd, ...args) => spawnSync(process.execPath, [cli, ...(args.length ? args : ['check'])], {cwd:at, env, encoding:'utf8'});
  try { await run({cwd, env, invoke, sandbox}); }
  finally { await rm(sandbox, {recursive:true, force:true}); }
}
const accepted = result => { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
const refused = (result, pattern) => { assert.notEqual(result.status, 0); assert.match(result.stderr, pattern); };
const borrow = cwd => symlink(modules, join(cwd, 'node_modules'), 'dir');

// Negative fixtures copy real published manifests/emitted files, not a fake host or
// modified live graph. Other exports are intentionally unnecessary: admission must
// never evaluate native packages. Positive coverage below uses the complete graph.
async function metadataFixture(cwd) {
  await cp(join(owner, 'package-lock.json'), join(cwd, 'package-lock.json'));
  for (const short of await readdir(join(modules, '@deepseek-ai'))) {
    const source = join(modules, '@deepseek-ai', short), target = join(cwd, 'node_modules/@deepseek-ai', short);
    const manifest = await json(join(source, 'package.json'));
    const entries = new Set(['package.json', manifest.main, manifest.module, manifest.types].filter(Boolean));
    if (short === 'dsh') for (const entry of ['lib/bin.js','lib/profile-boot.js','lib/types/profile-boot.d.ts']) entries.add(entry);
    for (const entry of entries) { await mkdir(dirname(join(target, entry)), {recursive:true}); await cp(join(source, entry), join(target, entry)); }
  }
}
async function snapshot(paths) {
  return Promise.all(paths.map(async path => {
    const info = await stat(path), bytes = await readFile(path);
    return [path, info.mode, info.size, info.mtimeMs, createHash('sha256').update(bytes).digest('hex')];
  }));
}

test('public npm check refuses missing and ancestor-only graphs, even with valid selectors', async () => {
  await consumer(async ({cwd, env, invoke, sandbox}) => {
    env.DSH_RUNTIME_ROOT = owner;
    env.DSH_TEST_INSTALL_ANCHOR = join(modules, '@deepseek-ai/dsh/package.json');
    refused(invoke(), /not provisioned.*npm ci.*no ancestor/s);
    await symlink(modules, join(sandbox, 'node_modules'), 'dir');
    refused(invoke(), /not provisioned.*no ancestor/s);
    await mkdir(join(cwd, 'node_modules'));
    assert.notEqual(invoke().status, 0, 'an empty own directory must not admit an ancestor graph');
    await assert.rejects(stat(join(cwd, 'node_modules/@deepseek-ai')), {code:'ENOENT'});
  });
});

test('actual clean npm graph accepts read-only reruns and borrowed whole graphs with the physical owner lock', async () => {
  await consumer(async ({cwd, env, invoke}) => {
    const paths = [join(owner, 'package-lock.json'), join(modules, '.package-lock.json')];
    for (const short of await readdir(join(modules, '@deepseek-ai'))) {
      const target = join(modules, '@deepseek-ai', short), manifest = await json(join(target, 'package.json'));
      for (const entry of ['package.json', manifest.main, manifest.module, manifest.types].filter(Boolean)) paths.push(join(target, entry));
    }
    const before = await snapshot(paths);
    const direct = accepted(invoke(root));
    assert.equal(direct.nativeVersion, '0.2.2-rc.2'); assert.equal(direct.cordisVersion, '4.1.0'); assert.equal(direct.driverSha256, driverHash);
    assert.equal(direct.owner, owner); assert.equal(direct.anchor, join(modules, '@deepseek-ai/dsh/package.json'));
    assert.deepEqual(accepted(invoke(root)), direct);
    await borrow(cwd);
    // Consumer-local unrelated lock must not replace physical graph owner provenance.
    await writeFile(join(cwd, 'package-lock.json'), '{}');
    assert.deepEqual(accepted(invoke()), direct);
    assert.deepEqual(accepted(invoke()), direct);
    assert.deepEqual(await snapshot(paths), before);
    for (const key of ['HOME','DSH_HOME','XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME','npm_config_cache']) assert.deepEqual(await readdir(env[key]), []);
    await assert.rejects(stat(join(modules, '.dsh-extras-source-host.json')), {code:'ENOENT'});
  });
});

test('explicit missing, empty and resolvable foreign selectors refuse; same-graph aliases accept', async () => {
  await consumer(async ({cwd, env, invoke, sandbox}) => {
    await borrow(cwd);
    const foreign = join(sandbox, 'foreign'), target = join(foreign, 'node_modules/@deepseek-ai/dsh');
    await mkdir(target, {recursive:true});
    await cp(join(modules, '@deepseek-ai/dsh/package.json'), join(target, 'package.json'));
    await writeFile(join(foreign, 'package.json'), '{}');
    for (const [name, values] of [
      ['DSH_RUNTIME_ROOT', ['', join(sandbox,'missing'), foreign]],
      ['DSH_TEST_INSTALL_ANCHOR', ['', 'package.json', join(sandbox,'missing.json'), join(foreign,'package.json'), join(target,'package.json')]],
    ]) for (const value of values) {
      env[name] = value; refused(invoke(), new RegExp(name)); delete env[name];
    }
    const alias = join(sandbox, 'alias'); await symlink(owner, alias, 'dir');
    for (const value of [owner, cwd, modules, join(modules,'@deepseek-ai'), join(modules,'@deepseek-ai/dsh'), alias]) {
      env.DSH_RUNTIME_ROOT = value; accepted(invoke());
    }
    delete env.DSH_RUNTIME_ROOT;
    for (const value of [join(owner,'package.json'), join(cwd,'package.json'), join(modules,'@deepseek-ai/dsh/package.json'), join(alias,'package.json')]) {
      env.DSH_TEST_INSTALL_ANCHOR = value; accepted(invoke());
    }
  });
});

test('copied published metadata refuses wrong versions, missing entries, unknown Goal bytes and foreign physical edges without repairs', async t => {
  await consumer(async ({cwd, invoke, sandbox}) => {
    await metadataFixture(cwd);
    accepted(invoke());
    const scope = join(cwd, 'node_modules/@deepseek-ai');
    for (const short of ['dsh','dsh-goal','dsh-agent','dsh-llm','cordis','schemastery']) await t.test('wrong version: ' + short, async () => {
      const path = join(scope, short, 'package.json'), before = await readFile(path);
      const manifest = JSON.parse(before); manifest.version = '0.0.0'; await writeFile(path, JSON.stringify(manifest));
      const snapshotBefore = await snapshot([path]); refused(invoke(), /Wrong native version/); assert.deepEqual(await snapshot([path]), snapshotBefore);
      await writeFile(path, before);
    });
    for (const entry of ['dsh/lib/bin.js', 'dsh-llm/lib/types/index.d.ts', 'dsh-goal-round-driver/lib/index.js']) await t.test('missing emitted entry: ' + entry, async () => {
      const path = join(scope, entry), saved = join(sandbox, 'saved'); await rename(path, saved);
      assert.notEqual(invoke().status, 0); await assert.rejects(stat(path), {code:'ENOENT'}); await rename(saved, path);
    });
    await t.test('unknown Goal hash', async () => {
      const path = join(scope, 'dsh-goal-round-driver/lib/index.js'), before = await readFile(path);
      await writeFile(path, Buffer.concat([before, Buffer.from('// unknown fixture bytes')]));
      const snapshotBefore = await snapshot([path]); refused(invoke(), /Unrecognized npm Goal driver hash/); assert.deepEqual(await snapshot([path]), snapshotBefore); await writeFile(path, before);
    });
    await t.test('individual foreign package symlink', async () => {
      const path = join(scope, 'cordis'), saved = join(sandbox, 'foreign-cordis'); await rename(path, saved); await symlink(saved, path, 'dir');
      refused(invoke(), /Foreign native package identity/); assert.equal(await realpath(path), saved);
      await rm(path); await rename(saved, path);
    });
    await t.test('declared edge selects another same-version Cordis', async () => {
      const target = join(scope, 'dsh-agent/node_modules/@deepseek-ai/cordis'); await mkdir(target, {recursive:true});
      await cp(join(scope, 'cordis/package.json'), join(target, 'package.json'));
      refused(invoke(), new RegExp('Foreign native graph:.* -> @deepseek-ai/cordis'));
      await rm(join(scope, 'dsh-agent/node_modules'), {recursive:true});
    });
    await t.test('admission does not evaluate native entrypoints', async () => {
      const path = join(scope, 'cordis/lib/index.js'), before = await readFile(path);
      await writeFile(path, 'throw new Error("NATIVE CODE MUST NOT RUN DURING ADMISSION");'); accepted(invoke()); await writeFile(path, before);
    });
    accepted(invoke());
  });
});

test('physical owner public lock is mandatory; nonregistry, invalid SRI and duplicate native records refuse', async t => {
  await consumer(async ({cwd, invoke, sandbox}) => {
    await metadataFixture(cwd);
    const path = join(cwd, 'package-lock.json'), before = await readFile(path);
    for (const [label, mutate] of [
      ['local resolution', lock => { lock.packages['node_modules/@deepseek-ai/dsh'].resolved = 'file:/tmp/local.tgz'; }],
      ['foreign registry', lock => { lock.packages['node_modules/@deepseek-ai/dsh'].resolved = 'https://example.com/dsh.tgz'; }],
      ['placeholder SRI', lock => { lock.packages['node_modules/@deepseek-ai/dsh'].integrity = 'sha512-fake'; }],
      ['native duplicate', lock => { lock.packages['node_modules/fixture/node_modules/@deepseek-ai/cordis'] = lock.packages['node_modules/@deepseek-ai/cordis']; }],
    ]) await t.test(label, async () => {
      const lock = JSON.parse(before); mutate(lock); await writeFile(path, JSON.stringify(lock));
      const snapshotBefore = await snapshot([path]); refused(invoke(), /provenance|SRI|nested native/); assert.deepEqual(await snapshot([path]), snapshotBefore); await writeFile(path, before);
    });
    const saved = join(sandbox, 'saved-lock'); await rename(path, saved);
    refused(invoke(), /Physical npm graph owner.*package-lock/); await assert.rejects(stat(path), {code:'ENOENT'});
  });
});

test('obsolete link command refuses without provisioning or profile mutation', async () => {
  await consumer(async ({cwd, env, invoke}) => {
    refused(invoke(cwd, 'link', owner), /Usage: native-host.mjs check/);
    await assert.rejects(stat(join(cwd, 'node_modules')), {code:'ENOENT'});
    assert.deepEqual(await readdir(env.DSH_HOME), []);
  });
});
