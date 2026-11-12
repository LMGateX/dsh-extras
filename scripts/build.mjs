import { checkNativeHost } from './native-host.mjs';
import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, cp, rm, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { distributions, sourceDirectories, clientDependencies } from './distributions.mjs';
import { writeDeclarations } from './declarations.mjs';
const root = resolve(import.meta.dirname, '..');
await checkNativeHost(root);
const source = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const rootRequire = createRequire(join(root, 'package.json'));
const hostRequire = createRequire(rootRequire.resolve('@deepseek-ai/dsh/package.json'));
const hostPackages = ['cosmokit', 'cordis', 'cordis-plugin-loader', 'dsh-agent', 'dsh-app-boot', 'dsh-compaction', 'dsh-goal', 'dsh-jobs', 'dsh-llm', 'dsh-system-prompt', 'dsh-token-meter', 'dsh-tools', 'dsh-ptc-runtime', 'dsh-host-webserver', 'dsh-client-connection', 'dsh-hmr', 'schemastery'];
for (const { name, modules } of distributions) {
  const out = join(root, 'dist', name);
  if (dirname(out) !== join(root, 'dist')) throw new Error('Unexpected distribution output');
  await rm(out, {recursive: true, force: true});
  await mkdir(join(out, 'lib'), {recursive: true});
  // Canonical ids may contain hyphens; never use them as JavaScript bindings.
  const aliases = modules.map((_, index) => 'feature' + index);
  const imports = modules.map((id, index) => 'import * as ' + aliases[index] + ' from "./src/modules/' + sourceDirectories[id] + '/index.ts";').join('\n');
  const modulePlugins = modules.map((id, index) => JSON.stringify(id) + ':' + aliases[index]).join(',');
  const server = imports + '\nimport {createExtrasPlugin} from "./src/runtime.ts";\nconst p=createExtrasPlugin({name:' + JSON.stringify(name) + ',moduleIds:' + JSON.stringify(modules) + ',modulePlugins:{' + modulePlugins + '}});\nexport const name=p.name,inject=p.inject,Config=p.Config,apply=p.apply;';
  const serverBuild = await build({metafile:true, stdin: {contents: server, resolveDir: root, sourcefile: 'extras-server-entry.ts', loader: 'ts'}, outfile: join(out, 'lib/index.js'), bundle: true, platform: 'node', format: 'esm', target: 'node24', external: ['@deepseek-ai/*', 'yaml'], sourcemap: true, legalComments: 'linked'});
  await build({entryPoints: [join(root, 'src/migration/index.ts')], outfile: join(out, 'lib/migration.js'), bundle: true, platform: 'node', format: 'esm', target: 'node24', external: ['@deepseek-ai/*', 'yaml'], sourcemap: true, legalComments: 'linked'});
  await build({entryPoints: [join(root, 'src/migration/cli.ts')], outfile: join(out, 'lib/migrate.js'), bundle: true, platform: 'node', format: 'esm', target: 'node24', external: ['@deepseek-ai/*', 'yaml'], sourcemap: true, legalComments: 'linked'});
  const hasChime = modules.includes('chime');
  const hasReasoning = modules.includes('compact-context') || modules.includes('model-policy');
  const hasModelPolicy = modules.includes('model-policy');
  const hasRetry = modules.includes('retry');
  const client = 'import {createExtrasClient} from "./client/composition.ts";\n'
    + (hasChime ? 'import {createChimeAdapter} from "./client/chime.ts";\n' : '')
    + (hasReasoning ? 'import {createReasoningAdapter} from "./client/reasoning-settings.ts";\n' : '')
    + (hasModelPolicy ? 'import {createModelPolicyAdapter} from "./client/model-policy-settings.ts";\n' : '')
    + (hasRetry ? 'import {createRetrySettingsAdapter} from "./client/retry-settings.ts";\n' : '')
    + (hasRetry ? 'import {createRequestRecoveryAdapter} from "./client/request-recovery.ts";\n' : '')
    + 'window.__ModuleLoader__.load({id:' + JSON.stringify(name) + ',factory(require){return createExtrasClient('
    + JSON.stringify({rowId:name,packageName:name,moduleIds:modules}) + ',require("react"),'
    + (hasChime ? 'createChimeAdapter' : 'undefined') + ','
    + (hasReasoning ? '(React)=>createReasoningAdapter(React,' + JSON.stringify(name) + ')' : 'undefined') + ','
    + (hasModelPolicy ? 'createModelPolicyAdapter' : 'undefined') + ','
    + (hasRetry ? 'createRetrySettingsAdapter' : 'undefined') + ','
    + (hasRetry ? 'createRequestRecoveryAdapter' : 'undefined') + ');}});';
  await build({stdin: {contents: client, resolveDir: root, sourcefile: 'extras-client-entry.ts', loader: 'ts'}, outfile: join(out, 'lib/client.js'), bundle: true, platform: 'browser', format: 'iife', target: 'es2022', sourcemap: true, legalComments: 'linked'});
  await writeFile(join(out, 'cordis.patch.yml'), '# Generated from the same feature source as every Extras distribution.\n- insert:\n    - id: ' + name + '\n      name: ' + name + '\n      config: {}\n');
  // Driver ownership detection resolves these dynamically from the installed DSH anchor.
  const actualHostPackages = Object.values(serverBuild.metafile.outputs).flatMap(output => output.imports)
    .filter(item => item.external && item.path.startsWith('@deepseek-ai/'))
    .map(item => item.path.split('/')[1]);
  const selectedHostPackages = [...new Set([...hostPackages, ...actualHostPackages, ...(modules.includes('goalWait') ? ['dsh-goal-round-driver'] : []), ...(modules.includes('goalWait') || modules.includes('retry') ? ['dsh'] : [])])].sort();
  const peers = Object.fromEntries(await Promise.all(selectedHostPackages.map(async pkg => {
    const fullName = '@deepseek-ai/' + pkg;
    const manifest = JSON.parse(await readFile(hostRequire.resolve(fullName + '/package.json'), 'utf8'));
    return [fullName, manifest.version];
  })));
  const manifest = {
    name, version: source.version, description: name === 'dsh-extras' ? source.description : 'DSH Extras: ' + modules[0] + ' distribution', type: 'module', license: source.license,
    main: './lib/index.js', types: './lib/index.d.ts', exports: {
      '.': {types: './lib/index.d.ts', default: './lib/index.js'},
      './client': {types: './lib/client.d.ts', default: './lib/client.js'},
      './migration': {types: './lib/migration.d.ts', default: './lib/migration.js'},
      './package.json': './package.json',
    },
    bin: {'dsh-extras-migrate': './lib/migrate.js'}, engines: source.engines, repository: source.repository,
    files: ['lib/', 'cordis.patch.yml', 'README.md', 'LICENSE', 'notices/', 'assets/', 'THIRD_PARTY_NOTICES.md', 'PUBLIC_PACKAGE_TYPES.md'],
    peerDependencies: peers, peerDependenciesMeta: Object.fromEntries(Object.keys(peers).map(key => [key,{optional:true}])),
    dependencies: {'@deepseek-ai/schemastery': peers['@deepseek-ai/schemastery'], yaml: source.dependencies.yaml},
    dsh: {bundle: {patch: 'cordis.patch.yml'}, client: {platform:'web', inject: [...new Set(modules.flatMap(id=>clientDependencies[id]))]}},
  };
  await writeFile(join(out, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  await copyFile(join(root, 'README.md'), join(out, 'README.md'));
  await copyFile(join(root, 'LICENSE'), join(out, 'LICENSE'));
  await copyFile(join(root, 'docs/PUBLIC_PACKAGE_TYPES.md'), join(out, 'PUBLIC_PACKAGE_TYPES.md'));
  await mkdir(join(out, 'notices'), {recursive: true});
  for (const id of modules) await copyFile(join(root, 'src/modules', sourceDirectories[id], 'NOTICE.txt'), join(out, 'notices', id + '.txt'));
  if (hasChime) {
    await copyFile(join(root, 'THIRD_PARTY_NOTICES.md'), join(out, 'THIRD_PARTY_NOTICES.md'));
    await cp(join(root, 'assets'), join(out, 'assets'), {recursive: true});
    // Source sound data is compiled into chime payload; source licenses remain downloadable.
  }
  if (modules.includes('goalWait')) {
    const driver = join(root, 'src/modules/goal-wait/driver');
    // The parity port may not exist on an older source baseline. Once present, both
    // provenance and license are mandatory; never copy host metadata or port assets
    // into distributions that did not select goalWait.
    let present = true;
    try { await access(driver); } catch (error) { if (error.code !== 'ENOENT') throw error; present = false; }
    if (present) {
      await mkdir(join(out, 'lib/driver'), {recursive: true});
      for (const file of ['provenance.json', 'UPSTREAM-LICENSE.txt']) await copyFile(join(driver, file), join(out, 'lib/driver', file));
    }
  }
  await writeDeclarations(root, out, {name, modules});
  console.log('Built ' + name + '@' + source.version + ' [' + modules.join(', ') + ']');
}
