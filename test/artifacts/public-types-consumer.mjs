import assert from 'node:assert/strict';
import {writeFile, mkdir, symlink} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join, dirname} from 'node:path';

const require = createRequire(import.meta.url);
export async function verifyPublicTypes(temp, name, modules) {
  await mkdir(join(temp, 'node_modules/@types'), {recursive:true});
  await symlink(dirname(require.resolve('@types/node/package.json')), join(temp, 'node_modules/@types/node'), 'dir');
  const selected = modules[0];
  const runtimeMigrationExports = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', 'console.log(JSON.stringify(Object.keys(await import(' + JSON.stringify(name + '/migration') + '))))'], {cwd:temp,encoding:'utf8',env:{...process.env,HOME:temp,DSH_HOME:join(temp,'dsh-home')},timeout:30000}));
  const fields = modules.map(id => {
    const expression = 'output.modules[' + JSON.stringify(id) + ']';
    return 'const enabled' + modules.indexOf(id) + ': boolean = ' + expression + '.enabled.get();\n'
      + '// @ts-expect-error Config output is a native volatile reference, not a plain value\n'
      + 'const plain' + modules.indexOf(id) + ': boolean = ' + expression + '.enabled;';
  }).join('\n');
  const featureChecks = [
    modules.includes('model-policy') ? 'const rootSelection: Readonly<{provider:string;model:string;reasoningEffort?:string|null}>|null|undefined = output.modules["model-policy"].root.get();\n// @ts-expect-error native null defaults may remain omitted\nconst requiredRoot: {provider:string;model:string}|null = output.modules["model-policy"].root.get();\nConfig({modules:{"model-policy":{enabled:true,root:{provider:"exact",model:"exact",reasoningEffort:null},descendants:null,workspaceOverrides:[{workspaceId:"native-id",root:null}],compactionReasoning:{enabled:true}}}});\n// @ts-expect-error exact model required\nConfig({modules:{"model-policy":{root:{provider:"exact"}}}});\n// @ts-expect-error workspace ID required\nConfig({modules:{"model-policy":{workspaceOverrides:[{root:null}]}}});' : '',
    modules.includes('retry') ? 'const codes: readonly string[] = output.modules.retry.errorCodes.get();\nConfig({modules:{retry:{providers:[],errorCodes:[],retryEmptyResponse:false}}});\n// @ts-expect-error wrong retry value\nConfig({modules:{retry:{retryEmptyResponse:"yes"}}});' : '',
    modules.includes('compact-context') ? 'const attempts: number = output.modules["compact-context"].retryAttempts.get();\nconst rules = output.modules["compact-context"].compactionReasoning.get().rules;\nConfig({modules:{"compact-context":{retryAttempts:0,ptcModelTimeouts:{},compactionReasoning:{enabled:true,rules:[{scope:"all",mode:"fixed",effort:"opaque"}]}}}});\n// @ts-expect-error wrong compaction value\nConfig({modules:{"compact-context":{notifyAtRatio:"high"}}});' : '',
    modules.includes('chime') ? 'const volume: number = output.modules.chime.volume.get();\nConfig({modules:{chime:{soundDone:"chime-soft",restMode:false}}});\n// @ts-expect-error unknown sound\nConfig({modules:{chime:{soundDone:"imaginary"}}});' : '',
    modules.includes('goalWait') ? 'const hold: number = output.modules.goalWait.maxHoldMs.get();\nConfig({modules:{goalWait:{maxHoldMs:0,waitForJobs:false}}});\n// @ts-expect-error wrong goal value\nConfig({modules:{goalWait:{maxHoldMs:"forever"}}});' : '',
    ...['compact-context','retry','chime','goalWait','model-policy'].filter(id=>!modules.includes(id)).map(id => '// @ts-expect-error non-selected module\nConfig({modules:{' + JSON.stringify(id) + ':{enabled:true}}});'),
  ].join('\n');
  const reasoningChecks = modules.includes('compact-context') ? [
    'const enabledOnly = Config({modules:{"compact-context":{compactionReasoning:{enabled:true}}}});',
    'const enabledOnlyFlag: boolean = enabledOnly.modules["compact-context"].compactionReasoning.get().enabled;',
    'const enabledOnlyRules: readonly {scope:string;mode:string}[] = enabledOnly.modules["compact-context"].compactionReasoning.get().rules;',
    'const rulesOnly = Config({modules:{"compact-context":{compactionReasoning:{rules:[]}}}});',
    'const rulesOnlyFlag: boolean = rulesOnly.modules["compact-context"].compactionReasoning.get().enabled;',
    '// @ts-expect-error rules keep required scope\nConfig({modules:{"compact-context":{compactionReasoning:{rules:[{mode:"inherit"}]}}}});',
    '// @ts-expect-error rules keep required mode\nConfig({modules:{"compact-context":{compactionReasoning:{rules:[{scope:"all"}]}}}});',
    '// @ts-expect-error fixed rules keep required effort\nConfig({modules:{"compact-context":{compactionReasoning:{rules:[{scope:"all",mode:"fixed"}]}}}});',
    '// @ts-expect-error provider rules keep required provider\nConfig({modules:{"compact-context":{compactionReasoning:{rules:[{scope:"provider",mode:"inherit"}]}}}});',
    '// @ts-expect-error provider-model rules keep required model\nConfig({modules:{"compact-context":{compactionReasoning:{rules:[{scope:"provider-model",provider:"exact",mode:"inherit"}]}}}});',
    '// @ts-expect-error unknown rule mode remains invalid\nConfig({modules:{"compact-context":{compactionReasoning:{rules:[{scope:"all",mode:"maybe"}]}}}});',
  ].join('\n') : '';
  const goalChecks = modules.includes('goalWait') ? [
    'for (const strategy of ["activation","replacement","native","off"] as const) {',
    '  const goalInput: ConfigInput = {modules:{goalWait:{strategy}}};',
    '  const accepted: "activation"|"replacement"|"native"|"off" = Config(goalInput).modules.goalWait.strategy.get();',
    '}',
    '// @ts-expect-error unsupported startup is not a continuation strategy\nConfig({modules:{goalWait:{strategy:"startup"}}});',
    '// @ts-expect-error resolved strategy remains a native volatile reference\nconst rawStrategy: "activation"|"replacement"|"native"|"off" = output.modules.goalWait.strategy;',
  ].join('\n') : '';
  if (modules.includes('goalWait')) {
    execFileSync(process.execPath, ['--input-type=module', '-e', [
      'import assert from "node:assert/strict";',
      'const {Config}=await import(' + JSON.stringify(name) + ');',
      'assert.equal(Config({modules:{goalWait:{}}}).modules.goalWait.strategy.get(),"activation");',
      'for(const strategy of ["activation","replacement","native","off"]) assert.equal(Config({modules:{goalWait:{strategy}}}).modules.goalWait.strategy.get(),strategy);',
      'assert.throws(()=>Config({modules:{goalWait:{strategy:"startup"}}}));',
    ].join('\n')], {cwd:temp,encoding:'utf8',stdio:'pipe',env:{...process.env,HOME:temp,DSH_HOME:join(temp,'dsh-home')},timeout:30000});
  }
  if (modules.includes('compact-context')) {
    execFileSync(process.execPath, ['--input-type=module', '-e', [
      'import assert from "node:assert/strict";',
      'const {Config}=await import(' + JSON.stringify(name) + ');',
      'assert.deepEqual(Config({modules:{"compact-context":{compactionReasoning:{enabled:true}}}}).modules["compact-context"].compactionReasoning.get(),{enabled:true,rules:[{scope:"all",mode:"inherit"}]});',
      'assert.deepEqual(Config({modules:{"compact-context":{compactionReasoning:{rules:[]}}}}).modules["compact-context"].compactionReasoning.get(),{enabled:false,rules:[]});',
    ].join('\n')], {cwd:temp,encoding:'utf8',stdio:'pipe',env:{...process.env,HOME:temp,DSH_HOME:join(temp,'dsh-home')},timeout:30000});
  }
  const source = [
    'import {name, inject, Config, apply} from ' + JSON.stringify(name) + ';',
    'import type {ConfigInput, ConfigOutput} from ' + JSON.stringify(name) + ';',
    'import type {Context} from "@deepseek-ai/cordis";',
    'import ' + JSON.stringify(name + '/client') + ';',
    'import * as migration from ' + JSON.stringify(name + '/migration') + ';',
    'type Equal<A,B> = (<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2) ? true : false;',
    'type Assert<T extends true> = T;',
    'type MigrationValueExports = Assert<Equal<keyof typeof migration, ' + runtimeMigrationExports.map(key=>JSON.stringify(key)).join(' | ') + '>>;',
    'type RootValueExports = Assert<Equal<keyof typeof import(' + JSON.stringify(name) + '), "name" | "inject" | "Config" | "apply">>;',
    'type ClientValueExports = Assert<Equal<keyof typeof import(' + JSON.stringify(name + '/client') + '), never>>;',
    'import type {NativeMigrationHost, Distribution, Discovery, MigrationPlan, MigrationReport, MigrationController} from ' + JSON.stringify(name + '/migration') + ';',
    'const identity: ' + JSON.stringify(name) + ' = name;',
    'const dependencies: string[] = inject;',
    'const input: ConfigInput = {modules:{' + JSON.stringify(selected) + ':{enabled:false}},migration:{auto:false}};',
    'const output: ConfigOutput = Config(input);',
    'const auto: boolean = output.migration.auto.get();',
    fields, featureChecks, reasoningChecks, goalChecks,
    'declare const ctx: Context; apply(ctx, output);',
    'declare const host: NativeMigrationHost; declare const discovery: Discovery;',
    'const target: Distribution = {rowId:identity,packageName:identity,moduleIds:[' + modules.map(id=>JSON.stringify(id)).join(',') + ']};',
    'const observed: Promise<Discovery> = migration.inspectMigration(host,target);',
    'const plan: MigrationPlan = migration.planMigration(discovery);',
    'const dry: Promise<MigrationPlan> = migration.dryRunMigration(host,target);',
    'const applied: Promise<MigrationReport> = migration.runMigration(host,target,{retry:true,checkpoint:async(stage:string)=>{}});',
    'const recovered: Promise<MigrationReport> = migration.rollbackMigration(host,target,{operationId:"test",modules:target.moduleIds});',
    'const controller: MigrationController = migration.startAutomaticMigration(host,{...target,auto:false,onReport(report:MigrationReport){}});',
    'controller.subscribe(state=>state.report); controller.inspect(); controller.retry(); controller.rollback({operationId:"test",modules:target.moduleIds}); controller.dispose();',
    'const ids: readonly ("compact-context"|"retry"|"chime"|"goalWait"|"model-policy")[] = migration.MODULE_IDS;',
    'const defaults: Record<string, Record<string, unknown>> = migration.LEGACY_DEFAULTS;',
    'const packages: Record<string, string> = migration.LEGACY_PACKAGES;',
    '// @ts-expect-error invalid migration target id\nmigration.inspectMigration(host,{rowId:identity,moduleIds:["unknown"]});',
    '// @ts-expect-error recovery requires operation id\nmigration.rollbackMigration(host,target,{modules:target.moduleIds});',
    '// @ts-expect-error root never exported legacy resolveConfig\nimport {resolveConfig} from ' + JSON.stringify(name) + ';',
    '// @ts-expect-error root has no feature runtimeStatus alias\nimport {runtimeStatus} from ' + JSON.stringify(name) + ';',
    '// @ts-expect-error client is only a ModuleLoader side effect\nimport {apply as clientApply} from ' + JSON.stringify(name + '/client') + ';',
    '// @ts-expect-error predecessor client-types path is not public\nimport type {} from ' + JSON.stringify(name + '/client-types') + ';',
    '// @ts-expect-error private implementation paths are not public\nimport type {} from ' + JSON.stringify(name + '/lib/types/src/migration/engine.js') + ';',
  ].join('\n').replaceAll('\\n', '\n');
  await writeFile(join(temp, 'consumer.ts'), source);
  await writeFile(join(temp, 'tsconfig.json'), JSON.stringify({compilerOptions:{target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noEmit:true,skipLibCheck:false,types:['node']},files:['consumer.ts']}));
  try {
    execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', join(temp, 'tsconfig.json'), '--pretty', 'false'], {cwd:temp,encoding:'utf8',stdio:'pipe',env:{...process.env,HOME:temp,DSH_HOME:join(temp,'dsh-home')},timeout:90000});
  } catch(error) {
    assert.fail('Clean NodeNext consumer failed (' + name + '):\n' + error.stdout + error.stderr);
  }
}
