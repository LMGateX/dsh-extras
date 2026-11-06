import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {sourceDirectories} from '../../scripts/distributions.mjs';
import {execFileSync} from 'node:child_process';
import {resolve, join} from 'node:path';
import {distributions} from '../../scripts/distributions.mjs';

const root = resolve(import.meta.dirname, '../..');
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
let hasGoalPort = true;
try { await access(join(root, 'src/modules/goal-wait/driver')); } catch(error) { if (error.code !== 'ENOENT') throw error; hasGoalPort = false; }
for (const {name, modules} of distributions) test('packed public declaration entries: ' + name, () => {
  const archive = join(root, 'artifacts', name + '-' + version + '.tgz');
  const manifest = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], {encoding:'utf8'}));
  const files = execFileSync('tar', ['-tzf', archive], {encoding:'utf8'}).split('\n');
  for (const [entry, filename] of [['.', 'index'], ['./client', 'client'], ['./migration', 'migration']]) {
    assert.equal(manifest.exports[entry].types, './lib/' + filename + '.d.ts', name + ' must advertise ' + entry + ' declarations');
    assert.ok(files.includes('package/lib/' + filename + '.d.ts'));
  }
  assert.equal(manifest.types, './lib/index.d.ts');
  assert.deepEqual(Object.keys(manifest.exports).sort(), ['.', './client', './migration', './package.json']);
  const declarationFiles = files.filter(file => file.endsWith('.d.ts'));
  for (const [id, directory] of Object.entries(sourceDirectories)) {
    assert.equal(declarationFiles.some(file => file.startsWith('package/lib/types/src/modules/' + directory + '/')), modules.includes(id), 'selected-only declarations: ' + id);
  }
  assert.ok(!declarationFiles.some(file => /\/(?:runtime|config|cli|storage|validation)\.d\.ts$/.test(file) && !file.includes('/modules/')), 'unreachable orchestration/CLI/validation declarations pruned');
  for (const file of declarationFiles) {
    const declaration = execFileSync('tar', ['-xOf', archive, file], {encoding:'utf8'});
    assert.ok(!/from ["']\.[^"']*\.ts["']/.test(declaration), 'NodeNext .js declaration imports: ' + file);
    assert.ok(!declaration.includes('/home/') && !declaration.includes('node_modules/'), 'portable declaration paths');
  }
  assert.equal(execFileSync('tar', ['-xOf', archive, 'package/lib/client.d.ts'], {encoding:'utf8'}).trim(), 'export {};');
  for (const file of ['provenance.json', 'UPSTREAM-LICENSE.txt']) {
    assert.equal(files.includes('package/lib/driver/' + file), modules.includes('goalWait') && hasGoalPort, 'selected goal driver asset ' + file);
  }
  for (const dependency of ['@deepseek-ai/dsh', '@deepseek-ai/dsh-goal-round-driver']) {
    assert.equal(Boolean(manifest.peerDependencies[dependency]), modules.includes('goalWait'), 'selected dynamic host peer ' + dependency);
    if (modules.includes('goalWait')) assert.equal(manifest.peerDependenciesMeta[dependency].optional, true);
  }
  for (const bundle of ['index', 'migration', 'migrate', 'client']) {
    const map = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/lib/' + bundle + '.js.map'], {encoding:'utf8'}));
    for (const [id, directory] of Object.entries(sourceDirectories)) {
      if (!modules.includes(id)) assert.ok(!map.sources.some(source => source.includes('/modules/' + directory + '/') && !source.endsWith('/reasoning-policy.ts')), 'no nonselected feature implementation in ' + bundle + ': ' + id);
    }
  }
});
