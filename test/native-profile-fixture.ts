/** Explicit disposable native profile facts, never inferred from an unidentified Context. */
import type { Context } from '@deepseek-ai/cordis';
import type { ProfileContext } from '@deepseek-ai/dsh-app-boot';
import type { TestContext } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const requireHere = createRequire(import.meta.url);
export const nativeProfileAnchor = process.env.DSH_RUNTIME_ROOT
    ? join(resolve(process.env.DSH_RUNTIME_ROOT), 'package.json') : requireHere.resolve('@deepseek-ai/dsh/package.json');
const requireNative = createRequire(nativeProfileAnchor);
export const nativeProfileBoot = () => import(pathToFileURL(requireNative.resolve('@deepseek-ai/dsh-app-boot')).href);

export async function nativeProfileFixture(t: TestContext, options: { home?: string; name?: string; bundles?: string[] } = {}) {
    const owned = options.home ? undefined : await mkdtemp(join(tmpdir(), 'extras-native-profile-'));
    if (owned) t.after(async () => {
        if (dirname(owned) !== resolve(tmpdir()) || !basename(owned).startsWith('extras-native-profile-')) throw new Error('unsafe native profile cleanup');
        await rm(owned, { recursive: true, force: true });
    });
    const home = options.home ?? join(owned!, 'dsh');
    if (!isAbsolute(home) || !resolve(home).startsWith(resolve(tmpdir()) + sep)) throw new Error('native profile fixture requires an explicit temporary home');
    const boot = await nativeProfileBoot();
    const dir = boot.resolveProfileDir(options.name ?? 'isolated', home);
    boot.initProfile(dir, options.bundles ?? []);
    const profile = boot.loadProfile('extras-test', options.name ?? 'isolated', nativeProfileAnchor, home);
    const context: ProfileContext = {
        name: profile.name, dir: profile.dir, patchPath: profile.patchPath, home,
        installAnchor: nativeProfileAnchor, cwd: process.cwd(),
        startedBundles: profile.layers.map((layer: { packageName: string }) => layer.packageName),
        overlays: [], telemetryDisabledEnv: '1',
    };
    return { boot, profile, context, provide(ctx: Context) { ctx.provide('profileContext', context); } };
}
