// Development admission only: read files and resolve public manifests, never load native code.
import {readFile, readdir, realpath, stat} from 'node:fs/promises';
import {join, resolve, dirname, relative, isAbsolute, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const VERSION = '0.2.2-rc.3';
// Independently observed published npm bytes; not an authorization for product owner guards.
const DRIVER = '8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c';
const native = name => name.startsWith('@deepseek-ai/');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const inside = (root, path) => { const rel = relative(root, path); return rel !== '' && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel); };
const fields = value => JSON.stringify(Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b)));

async function emitted(target, entry) {
  const path = resolve(target, entry);
  if (!inside(target, path) || !inside(target, await realpath(path)) || !(await stat(path)).isFile()) {
    throw new Error('Missing or foreign native emitted entrypoint: ' + path);
  }
}

async function checkSelectors(expected) {
  for (const name of ['DSH_RUNTIME_ROOT', 'DSH_TEST_INSTALL_ANCHOR']) {
    const value = process.env[name];
    if (value === undefined) continue;
    try {
      if (!value.trim()) throw new Error('Empty selector');
      let file;
      if (name === 'DSH_RUNTIME_ROOT') {
        const base = await realpath(resolve(value));
        if (!(await stat(base)).isDirectory()) throw new Error('Runtime root must be a directory');
        // Public harness bases: CLI package root, install parent, node_modules or scope.
        file = join(base, 'package.json');
      } else {
        if (!isAbsolute(value)) throw new Error('Install anchor must be absolute');
        file = await realpath(value);
        if (!(await stat(file)).isFile()) throw new Error('Install anchor must be a file');
      }
      const actual = await realpath(createRequire(file).resolve('@deepseek-ai/dsh/package.json'));
      if (actual !== expected) throw new Error('Foreign CLI identity');
    } catch {
      throw new Error(name + ' must resolve to the verified physical npm CLI manifest.');
    }
  }
}

export async function checkNativeHost(root) {
  let modules;
  try {
    // Deliberately no Node ancestor lookup until an explicit local graph exists.
    modules = await realpath(join(root, 'node_modules'));
    if (!(await stat(modules)).isDirectory()) throw new Error('Not a directory');
  } catch {
    throw new Error('Native npm host is not provisioned in this consumer: run npm ci (no ancestor/live fallback).');
  }
  const owner = dirname(modules);
  let lock;
  try { lock = await json(join(owner, 'package-lock.json')); }
  catch { throw new Error('Physical npm graph owner must have a public package-lock.json: ' + owner); }
  if (lock.lockfileVersion !== 3 || !lock.packages?.['']) throw new Error('Expected npm lockfileVersion 3.');
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue;
    // npm ci authenticates tarballs using these real registry SRI records. This
    // offline check verifies provenance/shape, not a substitute for npm's SRI check.
    let url;
    try { url = new URL(entry.resolved); } catch { /* rejected below */ }
    if (entry.link || !url || url.origin !== 'https://registry.npmjs.org' || url.username || url.password ||
        !/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity ?? '')) {
      throw new Error('Non-public registry provenance or invalid SRI in lock: ' + path);
    }
    if (new RegExp('(?:^|/)node_modules/@deepseek-ai/[^/]+$').test(path) && !new RegExp('^node_modules/@deepseek-ai/[^/]+$').test(path)) {
      throw new Error('Duplicate/nested native graph in lock: ' + path);
    }
  }

  const packages = new Map();
  for (const short of await readdir(join(modules, '@deepseek-ai'))) {
    const name = '@deepseek-ai/' + short;
    const target = join(modules, name);
    if (await realpath(target) !== target) throw new Error('Foreign native package identity: ' + name);
    const manifest = await json(join(target, 'package.json'));
    const entry = lock.packages['node_modules/' + name];
    const version = short === 'dsh' || short.startsWith('dsh-') ? VERSION :
      ({cordis: '4.1.0', schemastery: '3.19.0', cosmokit: '1.9.0'})[short];
    if (!entry || manifest.name !== name || manifest.version !== entry.version || (version && manifest.version !== version)) {
      throw new Error('Wrong native version or unlocked identity: ' + name);
    }
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
      if (fields(manifest[field]) !== fields(entry[field])) throw new Error('Native declaration/lock mismatch: ' + name + ' ' + field);
    }
    for (const entrypoint of [manifest.main, manifest.module, manifest.types].filter(Boolean)) await emitted(target, entrypoint);
    packages.set(name, {target, manifest});
  }
  for (const name of ['dsh', 'dsh-goal-round-driver', 'dsh-goal', 'dsh-agent', 'dsh-llm', 'cordis', 'cordis-plugin-loader', 'schemastery']) {
    const required = packages.get('@deepseek-ai/' + name);
    if (!required) throw new Error('Missing required native package: ' + name);
    if (name !== 'dsh') {
      for (const entry of name === 'schemastery' ? ['lib/index.cjs', 'lib/index.mjs'] : ['lib/index.js']) await emitted(required.target, entry);
      await emitted(required.target, 'lib/types/index.d.ts');
    }
  }
  const anchor = join(packages.get('@deepseek-ai/dsh').target, 'package.json');
  for (const entry of ['lib/bin.js', 'lib/profile-boot.js', 'lib/types/profile-boot.d.ts']) await emitted(dirname(anchor), entry);
  for (const [name, {target, manifest}] of packages) {
    const require = createRequire(join(target, 'package.json'));
    for (const edge of Object.keys({...manifest.dependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies}).filter(native)) {
      const optional = manifest.optionalDependencies?.[edge] || (!manifest.dependencies?.[edge] && manifest.peerDependenciesMeta?.[edge]?.optional);
      let actual;
      try { actual = await realpath(require.resolve(edge + '/package.json')); }
      catch {
        if (optional && !packages.has(edge)) continue;
        throw new Error('Missing native dependency: ' + name + ' -> ' + edge);
      }
      if (actual !== join(packages.get(edge)?.target ?? '', 'package.json')) {
        throw new Error('Foreign native graph: ' + name + ' -> ' + edge);
      }
    }
  }
  // Bind the consumer's public resolution as well as each native runtime/peer edge.
  const consumer = createRequire(join(resolve(root), 'package.json'));
  for (const [name, {target}] of packages) {
    if (await realpath(consumer.resolve(name + '/package.json')) !== join(target, 'package.json')) {
      throw new Error('Foreign consumer native graph: ' + name);
    }
  }
  const driver = packages.get('@deepseek-ai/dsh-goal-round-driver').target;
  const driverSha256 = createHash('sha256').update(await readFile(join(driver, 'lib/index.js'))).digest('hex');
  if (driverSha256 !== DRIVER) throw new Error('Unrecognized npm Goal driver hash.');
  await checkSelectors(anchor);
  return {nativeVersion: VERSION, cordisVersion: '4.1.0', driverSha256, packageCount: packages.size, owner, anchor};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== 'check') throw new Error('Usage: native-host.mjs check');
    console.log(JSON.stringify(await checkNativeHost(process.cwd())));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
