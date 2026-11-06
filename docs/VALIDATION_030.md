# 0.3.0 parity restoration — final engineering validation

**Engineering release gates passed.** Final execution crossed 2026-11-06/07 (Asia/Shanghai). Validated source/build baseline: [be7af671261c039a5fd6aa2b230579e60e5fd285](<https://github.com/LMGateX/dsh-extras/commit/be7af671261c039a5fd6aa2b230579e60e5fd285>). Subsequent changes are validation/release prose only; publication must preserve these exact tested archive bytes.

This report establishes build, acceptance and independent-review evidence. Git push, Release upload and unauthenticated public-download byte verification are separate required operations, not inferred from a green test or an authored report. Their publication receipt belongs on the [0.3.0 Release](<https://github.com/LMGateX/dsh-extras/releases/tag/v0.3.0>).

## Scope and isolation

The [fixed parity contract](<LEGACY_PARITY_030.md>) was committed before implementation, supplementing the [acceptance matrix](<ACCEPTANCE.md>). Feature, migration, native-owner, UI, PTC/retry and packaging work used isolated Git worktrees and subagents. The original repositories and real DSH home/profile remained outside the write/test targets. Installs, native hosts, browser sessions, caches and process data used explicit disposable HOME/DSH_HOME/XDG/profile/TMPDIR paths and temporary ports, never the live GUI. No production installation, restart, npm publication or GitHub Actions execution was performed. Actions were independently read as disabled before publication.

Audited baseline: Node **24.17.0**, TypeScript **5.9.3**, DSH **0.2.2-alpha.3**, Cordis **4.0.6-alpha.2**, native Loader **1.0.7-alpha.2**, React **18.3.1** and Chromium **1248**. Native driver SHA-256 is **1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de**; see [port provenance](<../src/modules/goal-wait/driver/provenance.json>). The original Goal source used for actual legacy acceptance was audited 0.4.23 commit **cbd86273660893336afaee31794b5fd76487db78**, not the older root checkout.

## Final executed gates

| Gate | Actual outcome |
| --- | --- |
| Typecheck and whitespace | npm run typecheck and git diff --check exited 0. |
| Full source — all 44 test files, actual audited legacy and current Goal module | **569 passed; 0 failed, skipped or cancelled**. Serialized runner, 110.258 seconds. Includes native Agent/goals/jobs/subagents, actual original migration/recovery/handover, PTC/runtime replacement/HMR, retry unload, shared settings, emitted/packed browser fixtures and existing regressions. |
| Build and pack | All five distributions built and packed as **0.3.0**, exit 0. Selected implementations, native metadata, declarations, notices, provenance/license and audio were verified. |
| Full artifacts — all five artifact test files | **23 passed; 0 failed, skipped or cancelled**, serialized, 90.468 seconds. Breakdown below. |
| Additional read-only final archive audit | Recomputed all five SHA-256 values; checked synchronized manifest identities/versions, absence of node_modules/Git/profile/sandbox/environment entries, author-machine paths in text payloads, and obvious credential/private-key material. All passed. This bounded audit is not a universal secret-detection claim. |

Artifact breakdown:

- **8** actual archive-root/native Loader/profile/ConfigEditor/Agent/goals/jobs cases across combined and Goal split. Job waiting stays armed without a waiting revision change; quiet completion dispatches one offline round; authorized switches preserve exact identity; observed external disarm stays revoked; whole descriptor replacements survive and withdraw authority; native/off/module-disable/whole-row-disable have their distinct semantics and restore only eligible original stock.
- **2** actual native CLI/profile cases: installed combined Web + Chromium, and composition of every packed manifest with distinct split peers. Browser acceptance stages replacement → off → native → activation, requires actual Save acknowledgment plus persisted values and exact live requested/mounted diagnostics, and retains grouped retry/timeout/unset/watermark/tools/reasoning/Chime/reload checks. Temporary Web origin was port 37299, not the live GUI.
- **2** actual packed native compaction-request reasoning cases, combined and compact split, with agent-facing tools disabled.
- **11** five clean npm-installed JavaScript/strict NodeNext TypeScript consumers plus external-dependency/declaration/archive checks. Four Goal strategies are accepted, unsupported startup is rejected in runtime and types, output stays native volatile, nested defaulted input omissions work, malformed rule fields remain rejected, and only the selected public payload is reachable.

All model execution in acceptance used deterministic offline adapters. The complete run exited 0; test fixtures completed their process/browser teardown and the outer checked disposable directory cleanup. Parent job and terminal inventories had no running entries afterward. Eight isolated research/implementation/integration worktrees are deliberately retained for audit; this report does not pretend they were deleted. Ignored test logs and cache seeds are not Git or Release assets.

## Executed command shape

The final shell first created and realpath-checked a short disposable /tmp/ex-fin-* directory, installed an exact-prefix checked EXIT cleanup, and exported HOME, DSH_HOME, TMPDIR, XDG_CACHE_HOME, XDG_CONFIG_HOME, XDG_DATA_HOME and npm_config_cache beneath it. DSH_EXTRAS_CHROMIUM selected the existing audited Chromium executable; DSH_EXTRAS_NATIVE_SEED selected only a disposable native cache seed, not production data. DSH_TEST_LEGACY_GOAL_ENTRY selected the exact audited original source above; DSH_TEST_EXTRAS_GOAL_ENTRY selected the integrated source entry. With those explicit environment bindings, these commands executed:

```sh
npm run typecheck
node --expose-internals --test --test-concurrency=1 \
  "test/client/browser.test.ts" \
  "test/client/chime-regression.test.ts" \
  "test/client/compaction-reasoning.test.ts" \
  "test/client/emitted.test.ts" \
  "test/client/forms.test.ts" \
  "test/client/lifecycle.test.ts" \
  "test/client/page-publication-browser.test.ts" \
  "test/client/page-publication.test.ts" \
  "test/client/reasoning-browser.test.ts" \
  "test/client/selected-payload.test.ts" \
  "test/client/settings-presentation-browser.test.ts" \
  "test/client/settings-presentation.test.ts" \
  "test/integration/admission-race.test.ts" \
  "test/integration/config.test.ts" \
  "test/integration/goal-strategies.test.ts" \
  "test/integration/lifecycle.test.ts" \
  "test/integration/module-identity.test.ts" \
  "test/integration/native-compaction-reasoning.test.ts" \
  "test/integration/native-driver-lease.test.ts" \
  "test/integration/native-ptc-timeout.test.ts" \
  "test/integration/ownership.test.ts" \
  "test/integration/scoped-compact-context.test.ts" \
  "test/integration/settings.test.ts" \
  "test/integration/status.test.ts" \
  "test/migration/discovery.test.ts" \
  "test/migration/engine.test.ts" \
  "test/migration/goal-ownership.test.ts" \
  "test/migration/native-lifecycle.test.ts" \
  "test/migration/planner.test.ts" \
  "test/migration/rollback-ownership.test.ts" \
  "test/migration/validation.test.ts" \
  "test/modules/chime/config.test.ts" \
  "test/modules/compact-context/end-to-end.test.ts" \
  "test/modules/compact-context/manual.test.ts" \
  "test/modules/compact-context/plugin.test.ts" \
  "test/modules/compact-context/reasoning-compatibility.test.ts" \
  "test/modules/compact-context/reasoning-config.test.ts" \
  "test/modules/compact-context/reasoning-lifecycle.test.ts" \
  "test/modules/compact-context/reasoning-runtime.test.ts" \
  "test/modules/goal-wait/host.test.ts" \
  "test/modules/goal-wait/live.test.ts" \
  "test/modules/goal-wait/plugin.test.ts" \
  "test/modules/retry/integration.test.ts" \
  "test/modules/retry/plugin.test.ts"
npm run build
npm run pack
node --expose-internals --test --test-concurrency=1 \
  test/artifacts/native-goal.test.ts \
  test/artifacts/native-profile.test.ts \
  test/artifacts/native-reasoning.test.ts \
  test/artifacts/packages.test.mjs \
  test/artifacts/public-types.test.mjs
git diff --check
```

The explicit native-compatible runner flag and serialized artifact execution are material to this evidence; a different convenience command is not silently substituted for this run.

## Independent review — separate axes

Reviewed cumulative base [6342ebbb1f8a14f546b86d940681417003d06be6](<https://github.com/LMGateX/dsh-extras/commit/6342ebbb1f8a14f546b86d940681417003d06be6>) through the fixed validated baseline. Fresh reviewers independently reproduced the observer descriptor-attribute takeover and legacy-gate rearm bypass, rather than accepting earlier green suites. Both were repaired without weakening contracts or labelling observable revocation as the approved unobservable limitation.

| Axis | Independent conclusion and execution |
| --- | --- |
| **Standards** | Both original hard findings closed; no confirmed new final-delta finding. Personally executed 25 native strategy cases, both original public reproductions and seven native lease cases: **34/34 passed**. The earlier possible duplicated draft-transaction structure remains a nonblocking heuristic, not a hard rule. |
| **Spec** | Both original P1 findings independently closed; cumulative remaining confirmed Spec findings zero. Personally executed both unchanged public reproductions, 25 native strategy cases and seven public-module native ownership/intent/foreign/restoration cases: **34/34 passed**. No further confirmed missing, partial or scope-creep defect. |

Their native-health/intent delta reviews also found no confirmed new issue; those rechecks were separate from the final Goal delta. Review executions are not counted as extra unique parent-suite cases, and neither reviewer claimed to have executed the parent's packed/browser/full-source gates.

## Failures that improved the gate

- Earlier source checkpoint 510/514 exposed two incomplete disposable build allowlists, a missing new-default expectation, and an invalid unmanaged-native positive fixture. All four were corrected without weakening authority assertions; affected-file rerun was 42/42 before the final 569/569.
- Real packed ConfigEditor and installed Chromium saves exposed the intentionally stopped stock fiber being counted as a new activation failure. The exact native instance's owned effective-disabled getter lease fixed the actual health path without persistent native disabled writes, fake fiber state or ignored reconcile errors. It stays through explicit original Entry initialization and cleans by full CAS on outcomes/close.
- Independent migration review rejected official callback identity alone, fake inventories and cross-root/namespace mismatches. Exact canonical retired pointers now establish known inactivity only, never a new restoration grant. Actual original-source migration/recovery and current replacement/off rescans remain in the final source gate; see [migration evidence](<../test/migration/PARITY_EVIDENCE.md>).
- Fresh public native and actual packed tests caught complete-descriptor CAS and observed-revocation bypass defects. The packed matrix first had four old passes/four new failures; the unchanged final matrix is **8/8**. The transition observer is now the only restoration authority; legacy gate cleanup cannot rearm around it. A non-installable observer cannot prevent native drain/close.
- Nested public input types first failed actual installed TS consumers, not a declaration-text guess. Input-only default omission was repaired while rule requirements and resolved volatile output remained strict.

PTC execution and retry empty-stop unload details remain in [PTC evidence](<../test/modules/compact-context/PTC_EVIDENCE.md>), and native Goal scenario history in [Goal evidence](<../test/modules/goal-wait/EVIDENCE.md>). Saved settings and DOM state are never substituted for runtime execution proof.

## Exact tested release bytes

| Archive | Bytes |
| --- | ---: |
| [dsh-extras-0.3.0.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.0/dsh-extras-0.3.0.tgz>) | 660368 |
| [dsh-extras-compact-context-0.3.0.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.0/dsh-extras-compact-context-0.3.0.tgz>) | 288828 |
| [dsh-extras-retry-0.3.0.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.0/dsh-extras-retry-0.3.0.tgz>) | 240558 |
| [dsh-extras-chime-0.3.0.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.0/dsh-extras-chime-0.3.0.tgz>) | 535875 |
| [dsh-extras-goal-wait-0.3.0.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.0/dsh-extras-goal-wait-0.3.0.tgz>) | 291884 |

[SHA256SUMS](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.0/SHA256SUMS>) must contain exactly:

```text
4af6c0968fd7aa6f40d5cf93f2c894ea42ee70a9298253ae4f7ecaf8fb26ae50  dsh-extras-0.3.0.tgz
ce4dbc27f3900e3968bc3c843141707cf4e62b007d0859dc4ebbf4b22849364b  dsh-extras-compact-context-0.3.0.tgz
a38c3c8bed43f916ec56a7f5f64114a3f3c34eff9d99f6c92661baf361aa29c4  dsh-extras-retry-0.3.0.tgz
e1b87b2009d75c25bc95b677222dc3a2617f1e087ff98a324313a127ec214623  dsh-extras-chime-0.3.0.tgz
ec9850f8811f9110b74d25f92d589138eed500070c8a8898b2db50f7c880bde7  dsh-extras-goal-wait-0.3.0.tgz
```

## Explicit limitations retained

Legacy activation cannot reliably identify repeated external same-value disarm during an already-owned boolean hold; replacement waiting avoids that hold pattern. Reliably observed transition revocations do fail closed. The temporary lifecycle observer is exact-artifact/frame-limited and refuses unknown/source-mapped shapes. Direct external descriptor writes have no native event: ownership loss is acted upon at observed public checkpoints/transition boundaries, not magically at assignment. A foreign nonconfigurable/nonwritable service-method descriptor can itself violate the native Cordis proxy contract; Extras does not overwrite it or claim to repair the damaged native service.

Arbitrary unnamed/unmarked custom schedulers are outside the cooperating native ownership model; offline CLI Goal operations therefore remain conservative. Native request reasoning is still an audited experimental adapter, off by default. No future-host compatibility, real-provider cache/cost/latency benefit or active-profile byte-content assertion is made. The real local profile was neither an installation nor an acceptance target.
