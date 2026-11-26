#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { dryRunMigration, rollbackMigration, runMigration } from './engine.ts';
import { MigrationOverlayError } from './discovery.ts';
import { MODULE_IDS, type Distribution, type ModuleId, type NativeMigrationHost } from './types.ts';

class MigrationUsageError extends Error {}

/** Explicit locations are mandatory: no ambient-home or live-profile fallback. */
export async function migrationMain(args = process.argv.slice(2)): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('dsh-extras-migrate <inspect|dry-run|apply|retry|rollback> --profile-dir DIR --dsh-home DIR --install-anchor package.json [--overlay PATH]... [--distribution NAME] [--operation ID --modules compact-context,retry,chime,goalWait,model-policy,host-timezone]');
    console.log('Repeat --overlay PATH in native DSH --patch order. Paths resolve from the current directory. Omit only for an invocation with no overlays.');
    return;
  }
  const [command = 'inspect', ...options] = args;
  const allowed = new Set(['profile-dir', 'dsh-home', 'install-anchor', 'distribution', 'operation', 'modules']);
  const flags: Record<string, string> = Object.create(null);
  const overlayPaths: string[] = [];
  for (let index = 0; index < options.length; index += 2) {
    const key = options[index]!, value = options[index + 1];
    if (!key.startsWith('--') || !value || value.startsWith('--')) throw new MigrationUsageError('Expected --name value. See --help for the supported options.');
    if (key === '--overlay') { overlayPaths.push(resolve(value)); continue; }
    const name = key.slice(2);
    if (!allowed.has(name) || Object.hasOwn(flags, name)) throw new MigrationUsageError('Unknown or repeated migration option. Use --overlay PATH (repeatable) for native DSH --patch files. See --help.');
    flags[name] = value;
  }
  for (const key of ['profile-dir', 'dsh-home', 'install-anchor']) if (!flags[key]) throw new Error('--' + key + ' is required; no ambient profile is selected');
  const rowId = flags['distribution'] ?? 'dsh-extras';
  const distributions: Record<string, readonly ModuleId[]> = { 'dsh-extras': MODULE_IDS, 'dsh-extras-compact-context': ['compact-context'], 'dsh-extras-retry': ['retry'], 'dsh-extras-chime': ['chime'], 'dsh-extras-goal-wait': ['goalWait'], 'dsh-extras-model-policy': ['model-policy'], 'dsh-extras-host-timezone': ['host-timezone'] };
  if (!distributions[rowId]) throw new Error('unknown distribution');
  const dir = resolve(flags['profile-dir']);
  const host: NativeMigrationHost = { profileContext: { dir, patchPath: join(dir, 'cordis.patch.yml'), home: resolve(flags['dsh-home']), installAnchor: resolve(flags['install-anchor']), overlayPaths }, loader: { entries: () => [] } };
  const target: Distribution = { rowId, packageName: rowId, moduleIds: distributions[rowId] };
  let output: unknown;
  if (command === 'inspect' || command === 'dry-run') {
    const plan = await dryRunMigration(host, target);
    output = { profileId: plan.profileId, revision: plan.revision, legacyMode: plan.legacyMode, problems: plan.problems,
      decisions: plan.decisions.map(d => ({ moduleId: d.moduleId, phase: d.phase, enabled: d.enabled, reason: d.reason,
        source: d.source ? { packageName: d.source.packageName, version: d.source.version, rowId: d.source.rowId, disabled: d.source.disabled } : undefined })) };
  } else if (command === 'retry' || command === 'apply') output = await runMigration(host, target, { retry: command === 'retry' });
  else if (command === 'rollback') {
    if (!flags.operation || !flags.modules) throw new Error('rollback requires --operation id --modules compact-context,retry,...');
    const modules = flags.modules.split(',');
    if (!modules.every(id => MODULE_IDS.includes(id as ModuleId))) throw new Error('invalid rollback module');
    output = await rollbackMigration(host, target, { operationId: flags.operation, modules: modules as ModuleId[] });
  } else throw new Error('expected inspect, dry-run, apply, retry or rollback');
  console.log(JSON.stringify(output, null, 2));
}
// npm installs the bin as a symlink. Canonicalize both sides, including when
// Node preserves the main-module symlink; imported/-e callers must not run it.
function isDirectEntry(): boolean {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1])); }
  catch { return false; }
}
if (isDirectEntry()) {
  migrationMain().catch(error => {
    console.error('Migration refused or failed; no unsafe overwrite was attempted. Inspect the private profile journal and retry.');
    if (error instanceof MigrationOverlayError || error instanceof MigrationUsageError) console.error(error.message);
    process.exitCode = 1;
  });
}
