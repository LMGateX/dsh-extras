import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readdir, readFile, rename, rm, realpath, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import type { NativeMigrationHost, ProfileFacts } from './types.ts';

const STORAGE_DIR = '.dsh-extras';

/** Bounded, path-free overlay diagnostics that the standalone CLI can display. */
export class MigrationOverlayError extends Error {}

export function launcherOverlayPaths(profile: ProfileFacts): string[] {
  // Alpha.2 supplies paths in argv order, never a startup patch snapshot.
  if (Object.hasOwn(profile, 'overlays')) throw new MigrationOverlayError('legacy launcher overlay snapshot is not native alpha.2 profile evidence');
  const paths: unknown = profile.overlayPaths;
  if (paths === undefined) throw new MigrationOverlayError('launcher overlay evidence unavailable; use a native profile or explicitly supply the invocation overlays');
  if (!Array.isArray(paths) || [...paths].some(path => typeof path !== 'string' || !isAbsolute(path))) {
    throw new MigrationOverlayError('launcher overlay paths must be absolute native profile inputs');
  }
  return [...paths];
}

async function optional<T>(read: () => Promise<T>): Promise<T | undefined> {
  try { return await read(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
const identityOf = (path: string) => optional(() => stat(path, { bigint: true }));

async function assertPrivateRoot(root: string): Promise<void> {
  const entry = await optional(() => lstat(root));
  if (entry && !entry.isDirectory()) throw new MigrationOverlayError('private migration storage must be a non-symlink directory');
}

/** Protect read-only inputs from every profile output, including the native locking namespace. */
export async function assertSeparateOverlays(dir: string, patch: string, overlays: Iterable<string>): Promise<void> {
  const root = join(dir, STORAGE_DIR), manifest = join(dir, 'package.json'), lock = manifest + '.lock';
  const isLockName = (name: string) => name === basename(lock) || name.startsWith(basename(lock) + '.takeover-');
  const reserved = (path: string) => {
    const fromRoot = relative(root, path);
    if (fromRoot !== '..' && !fromRoot.startsWith('..' + sep) && !isAbsolute(fromRoot)) throw new MigrationOverlayError('read-only overlay overlaps reserved private migration storage');
    if (dirname(path) === dir && isLockName(basename(path))) throw new MigrationOverlayError('read-only overlay overlaps reserved native writer lock storage');
    if (path === patch) throw new MigrationOverlayError('read-only overlay aliases the writable profile patch');
    if (path === manifest) throw new MigrationOverlayError('read-only overlay aliases the writable profile manifest');
  };
  await assertPrivateRoot(root);
  const present = [];
  for (const path of overlays) {
    reserved(resolve(path));
    const physical = await optional(() => realpath(path));
    if (!physical) {
      // A dangling symlink could turn into an alias as soon as migration creates
      // its target. An absent leaf may still have a symlinked parent directory.
      if (await optional(() => lstat(path))) throw new MigrationOverlayError('overlay filesystem identity cannot be verified');
      const parent = await optional(() => realpath(dirname(path)));
      if (parent) reserved(join(parent, basename(path)));
      continue;
    }
    reserved(physical);
    const identity = await identityOf(path);
    if (!identity) throw new MigrationOverlayError('overlay filesystem identity changed during discovery');
    present.push(identity);
  }
  if (present.length === 0) return;
  // The private writer only creates direct children. Enumerate metadata only
  // so external hardlinks to existing output inodes cannot evade the guard.
  const outputs = [patch, manifest, ...(await optional(() => readdir(root)) ?? []).map(name => join(root, name)),
    ...(await readdir(dir)).filter(isLockName).map(name => join(dir, name))];
  for (const path of outputs) {
    const identity = await identityOf(path);
    if (identity && present.some(overlay => identity.dev === overlay.dev && identity.ino === overlay.ino)) reserved(path);
  }
}

export const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export async function readOptional(path: string): Promise<string | null> {
  try { return await readFile(path, 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
/** Permission-private, same-filesystem rename commit; fsync payload before publication. */
export async function writePrivate(path: string, text: string): Promise<void> {
  const parent = dirname(path);
  if (basename(parent) === STORAGE_DIR) await assertPrivateRoot(parent);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  if (basename(parent) === STORAGE_DIR) await assertPrivateRoot(parent);
  const temporary = path + '.' + randomUUID() + '.tmp';
  const file = await open(temporary, 'wx', 0o600);
  try { await file.writeFile(text); await file.sync(); } finally { await file.close(); }
  try { await rename(temporary, path); } catch (error) { await rm(temporary, { force: true }); throw error; }
  // Directory sync is supported on Unix; Windows may refuse opening directories.
  try { const dir = await open(dirname(path), 'r'); try { await dir.sync(); } finally { await dir.close(); } } catch (error) { if (process.platform !== 'win32') throw error; }
}
export async function profilePaths(host: NativeMigrationHost, rowId: string) {
  if (!/^[a-z0-9-]+$/.test(rowId)) throw new Error('unsafe distribution identity');
  const dir = await realpath(host.profileContext.dir);
  if (resolve(host.profileContext.patchPath) !== join(dir, 'cordis.patch.yml')) throw new Error('nonstandard profile patch location');
  const root = join(dir, STORAGE_DIR);
  await assertPrivateRoot(root);
  return { dir, root, manifest: join(dir, 'package.json'), patch: join(dir, 'cordis.patch.yml'), journal: join(root, digest(rowId).slice(0, 24) + '.json') };
}
/** Share native management's exact writer lock; never wait for HMR while holding it. */
export async function withProfileLock<T>(host: NativeMigrationHost, operation: () => Promise<T>): Promise<T> {
  const { dir, patch, manifest } = await profilePaths(host, 'lock');
  const overlayPaths = launcherOverlayPaths(host.profileContext);
  // Native withFileLock can claim and unlink a stale lock before calling us.
  // Fence launcher/HOME aliases before entering it, then inspect again under it.
  await assertSeparateOverlays(dir, patch, [join(await realpath(host.profileContext.home), 'cordis.patch.yml'), ...overlayPaths]);
  const require = createRequire(host.profileContext.installAnchor);
  const native = require('@deepseek-ai/dsh-atomic-write') as { withFileLock<T>(path: string, work: () => Promise<T>, options: { waitMs: number }): Promise<T> };
  return native.withFileLock(manifest, operation, { waitMs: 1500 });
}
