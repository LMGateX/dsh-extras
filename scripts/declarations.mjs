import ts from 'typescript';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve, relative} from 'node:path';
import {sourceDirectories} from './distributions.mjs';

// Types follow the actual selected source interfaces, not predecessor package aliases.
const configTypes = {
  'compact-context': ['config', 'ResolvedConfig'],
  retry: ['index', 'Config'],
  chime: ['config', 'ResolvedRowConfig'],
  goalWait: ['config', 'ResolvedConfig'],
  'model-policy': ['policy', 'ResolvedConfig'],
};

export async function writeDeclarations(root, out, {name, modules}) {
  const virtualEntry = join(root, 'extras-public-entry.ts');
  const imports = modules.map((id, index) => {
    const [file, type] = configTypes[id];
    return 'import type { ' + type + ' as Feature' + index + ' } from "./src/modules/' + sourceDirectories[id] + '/' + file + '.ts";';
  });
  const entry = [
    'import type Schema from "@deepseek-ai/schemastery";',
    'import type { Volatile } from "@deepseek-ai/cosmokit";',
    'import type { Context } from "@deepseek-ai/cordis";',
    ...imports,
    'type PlainField<T> = T extends { get(): infer V } ? V : T;',
    'type FeatureValues<T> = { [K in keyof T]-?: PlainField<T[K]> };',
    ...(modules.includes('model-policy') ? ['type NativeNullableValues<T> = { [K in keyof T]-?: K extends "root" | "descendants" ? PlainField<T[K]> | undefined : PlainField<T[K]> };'] : []),
    'interface ModuleValues {',
    ...modules.map((id, index) => JSON.stringify(id) + ': ' + (id === 'model-policy' ? 'NativeNullableValues' : 'FeatureValues') + '<Feature' + index + '> & { enabled: boolean };'),
    '}',
    // Only the policy object itself has nested defaults. Keep rule elements intact.
    ...(modules.some(id => id === 'compact-context' || id === 'model-policy') ? ['type DefaultedObjectInput<T, K extends keyof T> = Omit<Partial<T>, K> & { [P in K]?: Partial<T[P]> };'] : []),
    'interface ModuleInputs {',
    ...modules.map(id => JSON.stringify(id) + ': ' + (id === 'compact-context' || id === 'model-policy'
      ? 'DefaultedObjectInput<ModuleValues[' + JSON.stringify(id) + '], "compactionReasoning">'
      : 'Partial<ModuleValues[' + JSON.stringify(id) + ']>') + ';'),
    '}',
    'export interface ConfigInput { modules?: Partial<ModuleInputs>; migration?: { auto?: boolean } }',
    'export interface ConfigOutput { modules: { [K in keyof ModuleValues]: { [F in keyof ModuleValues[K]]: Volatile<ModuleValues[K][F]> } }; migration: { auto: Volatile<boolean> } }',
    'export declare const name: ' + JSON.stringify(name) + ';',
    'export declare const inject: string[];',
    'export declare const Config: Schema<ConfigInput, ConfigOutput>;',
    'export declare function apply(ctx: Context, config: ConfigOutput): void;',
  ].join('\n');
  const options = {target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true, declaration: true, emitDeclarationOnly: true, allowImportingTsExtensions: true, skipLibCheck: false,
    rootDir: root, outDir: join(root, '.declaration-emit'), types: ['node']};
  const host = ts.createCompilerHost(options);
  const originalRead = host.readFile.bind(host), originalExists = host.fileExists.bind(host);
  const configPaths = new Set(modules.map(id => join(root, 'src/modules', sourceDirectories[id], configTypes[id][0] + '.ts')));
  host.readFile = path => {
    if (resolve(path) === virtualEntry) return entry;
    const text = originalRead(path);
    if (!text || !configPaths.has(resolve(path))) return text;
    // Emit source-authored config interfaces without unrelated runtime plugin/schema
    // declarations. The native schema implementation's inferred type may include
    // nested host package paths; it is not this distribution's public Config.
    const parsed = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const types = parsed.statements.filter(node => ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node));
    const names = new Set(), queries = new Set();
    function identifiers(node) {
      if (ts.isIdentifier(node)) names.add(node.text);
      if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) queries.add(node.exprName.text);
      ts.forEachChild(node, identifiers);
    }
    types.forEach(identifiers);
    const statements = parsed.statements.flatMap(node => {
      if (types.includes(node)) return [node.getText(parsed)];
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => ts.isIdentifier(item.name) && queries.has(item.name.text))) return [node.getText(parsed)];
      if (!ts.isImportDeclaration(node) || !node.importClause) return [];
      const clause = node.importClause, bindings = clause.namedBindings;
      const parts = [];
      if (clause.name && names.has(clause.name.text)) parts.push(clause.name.text);
      if (bindings && ts.isNamedImports(bindings)) {
        const used = bindings.elements.filter(item => names.has(item.name.text));
        if (used.length) parts.push('{ ' + used.map(item => item.getText(parsed).replace(/^type /, '')).join(', ') + ' }');
      } else if (bindings && names.has(bindings.name.text)) parts.push('* as ' + bindings.name.text);
      return parts.length ? ['import type ' + parts.join(', ') + ' from ' + node.moduleSpecifier.getText(parsed) + ';'] : [];
    });
    return statements.join('\n');
  };
  host.fileExists = path => resolve(path) === virtualEntry || originalExists(path);
  const emitted = new Map();
  host.writeFile = (path, text) => emitted.set(relative(options.outDir, path), text);
  const program = ts.createProgram([virtualEntry, join(root, 'src/migration/index.ts')], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName:x=>x, getCurrentDirectory:()=>root, getNewLine:()=> '\n'}));
  const result = program.emit();
  if (result.emitSkipped || result.diagnostics.length) throw new Error('Public declaration emit failed');
  // Only declaration-import reachability determines payload, never source-import reachability.
  // Runtime-only imports (e.g. migration validators) must not leak other feature declarations.
  const pending = ['extras-public-entry.d.ts', 'src/migration/index.d.ts'];
  const visited = new Set();
  while (pending.length) {
    const key = pending.pop();
    if (visited.has(key)) continue;
    visited.add(key);
    const text = emitted.get(key);
    if (text === undefined) throw new Error('Missing reachable declaration: ' + key);
    const parsed = ts.createSourceFile(key, text, ts.ScriptTarget.Latest, true);
    const references = [];
    function visit(node) {
      if (ts.isStringLiteral(node) && ((ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) && node.parent.moduleSpecifier === node
        || ts.isLiteralTypeNode(node.parent) && ts.isImportTypeNode(node.parent.parent))) {
        if (node.text.startsWith('.')) references.push(node.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
    for (const spec of references) pending.push(join(dirname(key), spec).replace(/\.(?:ts|js)$/, '.d.ts'));
    // Model-only declarations share the pure reasoning policy, not a compact feature subtree.
    const payloadKey = !modules.includes('compact-context') && key === 'src/modules/compact-context/reasoning-policy.d.ts'
      ? 'src/shared-compaction/reasoning-policy.d.ts' : key;
    const output = key === 'extras-public-entry.d.ts' ? join(out, 'lib/index.d.ts') : join(out, 'lib/types', payloadKey);
    let rewritten = text.replace(/(["'])(\.[^"']*)\.ts\1/g, '$1$2.js$1');
    if (key === 'extras-public-entry.d.ts') rewritten = rewritten.replaceAll('./src/', './types/src/');
    if (!modules.includes('compact-context')) rewritten = rewritten.replaceAll('../compact-context/reasoning-policy.js', '../../shared-compaction/reasoning-policy.js');
    await mkdir(dirname(output), {recursive: true});
    await writeFile(output, rewritten);
  }
  await writeFile(join(out, 'lib/migration.d.ts'), 'export * from "./types/src/migration/index.js";\n');
  // Native ModuleLoader side effect script; it does not export an apply function.
  await writeFile(join(out, 'lib/client.d.ts'), 'export {};\n');
}
