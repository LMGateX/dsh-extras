# rc.1 native migration discovery proof repair

Date: 2026-11-07 (Asia/Shanghai). Scoped repair from integration commit `297867099530b8936542a359b8cec04bb80148c7`, following the independent Spec review of [the fixed rc contract](<../../docs/DSH_RC1_040.md#L13>). This fixes an inherited proof gap, not a relaxation or new baseline.

## Reproduced gap and public seams

[Native discovery](<../../src/migration/native-owner.ts>) previously verified anchored Cordis but imported arbitrary anchored driver `apply` without checking its manifest/fingerprint or anchored Loader identity. The later Goal runtime coordinator had stronger guards, but discovery output also feeds migration admission/restoration: those downstream checks did not make discovery truthful. The public seams agreed with the integration owner are [source inspect/dry-run](<native-owner-runtime.test.ts>) with actual native Loader/Context/Fiber tuples and [packed migration API](<../artifacts/migration-runtime.test.mjs>) through clean consumers. No private production method or live host mutation is used.

Three sequential red/green slices were executed:

1. An unknown driver version whose module reexports the exact genuine callback was incorrectly reported `verified:true, stockActive:true` beside an actual active native Loader tuple. The new test failed `true !== false`; an exact manifest name/version check made it pass.
2. A same-version altered module reexporting that callback was likewise accepted. Its top-level evaluation marker also demonstrates why reading the callback is insufficient. The new test again failed `true !== false`; verifying the audited driver entry SHA-256 **before import** made it pass and leaves the marker absent.
3. Missing Loader evidence, historical/future Loader versions and a foreign same-version Loader class all incorrectly verified the active tuple. Four subcases plus the enclosing test failed; exact Loader manifest name/version and present-service anchored class checks made all pass.

The strengthened packed matrix was also executed against the **unchanged vulnerable integration archive**: combined `dsh-extras` passed its original active/scoped/shadow/Cordis-shape positives and then failed the new unknown-driver refusal with `true !== false`. This is intentional packed RED, not accepted release evidence.

## Repair boundary

- No continuation Context still returns offline-unverified **before any peer acquisition**. Offline/API/help/no-hoisted-peer behavior is retained.
- Driver proof requires exact package name and `0.2.2-rc.1`, and entry SHA-256 `1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de`, before evaluating its module.
- Loader proof requires exact package name and `1.1.0`. If a Loader service is present, it must be an instance of the explicitly anchored Loader class with the expected inventory interface. The consumer’s own peer tree is never used.
- As explicitly accepted by the integration owner, a genuine empty Context without a mounted Loader may still prove **absence** only after exact anchored package/source checks, with `stockActive:false`; this is not an active stock-restoration grant.
- Existing root-lifetime/callback markers, exact row/namespace/raw-Fiber/root/callback/Loader inventory correlation, scoped Context positives, retired-stock known inactivity, and foreign-owner refusals remain unchanged.
- All refusal reasons are bounded; unknown artifacts neither stop the original stock Fiber nor persist disabled intent.

## Executed validation and limits

Initial strengthened source proof/Goal ownership run: **19 passed, zero failed/skipped/cancelled/todo**, exit 0, 2.868 seconds. It explicitly selected the audited historical Goal 0.4.23 source and the integrated current Extras Goal module; diagnostics confirm actual source recovery/handover and actual replacement/off rescans. No fallback actor is claimed as source execution.

Commands use a fresh whitelisted environment and explicit disposable HOME, DSH_HOME, TMPDIR, XDG config/data/cache and npm cache beneath short `/tmp/ex-proof-*` roots outside dependency ancestry. Shared integration rc dependencies are linked read-only. Test-created profiles/consumers are removed by their own guarded teardown. No live GUI URL, server or original source installation is involved. Two initial typecheck attempts caught only TypeScript structural inventory annotations (`Entry.moduleNamespace` is wider than the migration facade); the runtime guard was not weakened to resolve them. Final typecheck/build/pack exited 0 and produced all five candidate archives. Final source proof/ownership run passed **19/19**, zero failures/skips/cancellations/todos, exit 0, 2.880 seconds, including public dry-run conflict/admission refusal. The repaired **all-five packed native proof consumers passed 5/5**, zero failures/skips/cancellations/todos, exit 0, 17.873 seconds. Every distribution imported its migration API in a plain-Node consumer with no consumer Cordis and no resolver/bootstrap hooks, preserved active/scoped/retired stock positives and local-shadow refusal, and passed the new unknown/changed-driver and missing/version/foreign-Loader negatives. Every case confirmed the unverified driver was not evaluated, stock remained active during refusal, final profile bytes stayed unchanged and offline refusal preceded peer acquisition. These five tests exercise common migration exports even in non-Goal splits; they do not claim those splits mount a Goal feature.

```sh
node --expose-internals --test --test-timeout=25000 --test-concurrency=1 \
  test/migration/native-owner-runtime.test.ts test/migration/goal-ownership.test.ts
node node_modules/typescript/bin/tsc --noEmit
npm run build
npm run pack
node --expose-internals --test --test-concurrency=1 test/artifacts/migration-runtime.test.mjs
git diff --check
```

These scoped gates do not replace the integration owner’s full unchanged-final-byte source/artifact/native-Web/browser acceptance and independent review.
