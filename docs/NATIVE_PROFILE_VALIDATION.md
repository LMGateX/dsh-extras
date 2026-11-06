# Native packed-profile acceptance

The executable gate is [the native profile test](../test/artifacts/native-profile.test.ts). It uses the public dev dependency `@deepseek-ai/dsh` at 0.2.2-alpha.3, resolves its declared CLI entry, and installs release tarballs through the real `dsh plugin --profile … add` command. It never imports Extras runtime sources or rebuilds a client wrapper.

## Scope and isolation

- Each run creates a disposable `.sandbox-native-*` directory and sets explicit `HOME`, `DSH_HOME`, XDG config/data/cache roots and npm cache. The child receives no inherited provider credentials.
- A custom profile is copied from the shipped native web template using `--from-default-profile web`. Package installation automatically selects the native bundle.
- The actual native web application starts with `--host 127.0.0.1 --port 0 --no-open`; the active GUI port is rejected. Chromium follows the process-authenticated URL without printing its token.
- Teardown closes Chromium, terminates the owned native process group with a bounded escalation, and only then removes the sandbox. No real profile or predecessor repository is an installation target.
- An optional `DSH_EXTRAS_NATIVE_SEED` may name a retained test sandbox in the same checkout. Only its disposable package cache/store is copied into the fresh sandbox; the native installer then installs the current tarball with `--offline`. This handles registry outages without using a developer cache or bypassing the native installer.

## Executed assertions

1. All five tarballs install into independently initialized native profiles and each inserts exactly one correctly identified row. Their installed manifests expose singular `dsh.client.platform: web` and the native bundle patch. Four different split peers also compose together without the combined row.
2. The combined packed client appears in the actual `__DSH_BOOT__.entries` graph. Its native-served script hashes identically to the installed `lib/client.js` after removing only the native source-map trailer and standalone concatenation separator. Native transport rewrites these two items; executable plugin code is not rebuilt by the test.
3. Native Plugins shows a single installed Extras card; opening the real component Configure view renders four settings sections.
4. Native form edits save a 3.5-second retry base delay as 3500 milliseconds, save retry enabled=false, and save rest mode=true through the sidebar. A full page reload preserves all three values; the native profile patch independently contains them.
5. Saving the original chime master checkbox off removes its sidebar runtime control while all four settings sections remain available.
6. The owner-authenticated status endpoint returns the selected module statuses. Both uncaught page exceptions and console errors fail the browser gate.

No conversation, model-provider request, or synthetic host service is used. The full-profile test proves native installation, composition, client loading, native configuration persistence and runtime UI disposal; it does not by itself prove a model compaction request or an actual predecessor-to-Extras migration.

## Defects this gate caught

The gate was strengthened from page exceptions alone to console errors too, which exposed a real package-page fallback crash: native configForms methods require their receiver, but the fallback passed `getSnapshot`/`subscribe` detached to React, and slot error boundaries had hidden the exception. A focused receiver-sensitive form regression reproduced it first; stable WeakMap-cached wrappers now preserve both native method receivers, and the packed browser gate passes with zero console errors or page exceptions.

The same stock web composition initially reported context as `missing-dependency` for compaction while the other three modules were active. The host sources explain why: the web layer disables global compaction and native agent presets mount isolated compaction backends. The adapter now resolves the exact retained preset backend for the target agent and never falls back to another agent's engine; absence is reported truthfully for that target.

The registry intermittently returned ECONNRESET for dependencies after earlier fresh installs had succeeded. Later runs copied only a disposable cache/store and still installed new profiles through the real CLI offline. That environmental retry is separate from the product defects above.

## Execution record

On 2026-11-06, `npm run check && npm run pack && npm run test:artifacts` built all five distributions from the accepted tree and passed strict TypeScript, 387/387 source tests, 7/7 packed tests and the native gates with zero failures or skips. The fresh stock web profile bound isolated loopback port **32839** and reported **context, retry, chime and goalWait all active**; the test explicitly asserts context activation without any global compaction engine. All native edit/full-reload, chime-disposal, installed-client-SHA and zero-console/page-error assertions passed. No seed bypass or synthetic client wrapper was used.

The accepted checksums are recorded in [release validation](VALIDATION.md). Per-agent real native compaction transactions and retained preset revisions are separately verified by [scoped context integration](../test/integration/scoped-context.test.ts). All verification was local; GitHub Actions is prohibited, disabled and absent from the repository.
