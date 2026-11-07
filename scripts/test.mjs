import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const mode = process.argv[2] || 'source';
const entries = await readdir(join(root, 'test'), {recursive: true});
const files = entries.filter(name => /[.]test[.](ts|mjs|js)$/.test(name)).filter(name => mode === 'artifacts' ? name.startsWith('artifacts/') : !name.startsWith('artifacts/')).sort().map(name => join(root, 'test', name));
if (!files.length) throw new Error('No tests discovered for ' + mode);
console.log('Running ' + files.length + ' test files [' + mode + ']');
// Native PTC fixtures require Node internals; serialize native/browser consumers so
// the documented acceptance command is also the package's ordinary test entry.
const result = spawnSync(process.execPath, ['--expose-internals', '--test', '--test-concurrency=1', ...files], {cwd: root, stdio: 'inherit', env: process.env});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
