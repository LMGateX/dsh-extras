# Release validation evidence — 0.1.0

Historical evidence: the executions below predate the canonical module rename. Their `context` module/status name is historical (now `compact-context`); recorded commands, counts, checksums and outcomes are not new rename-validation results.

**Local release acceptance passed on 2026-11-06 (+08:00)** against DSH `0.2.2-alpha.3`, Node `24.17.0` (minimum `>=24.9.0`) and strict TypeScript `5.9.3`. The SHA-256 values at the end identify the exact accepted artifacts; the published Release serves these bytes unchanged.

## Contract and isolation

- The [specification](SPEC.md), [architecture](ARCHITECTURE.md) and [migration rules](MIGRATION.md) were fixed before implementation, and the [acceptance matrix](ACCEPTANCE.md) is the delivery gate. Required departures are recorded in [amendments](AMENDMENTS.md).
- Installs and host launches use explicit disposable `HOME`, `DSH_HOME`, XDG roots, caches and profiles. Native hosts bind loopback port 0 and explicitly refuse the active GUI port; child hosts receive no provider credentials.
- GitHub Actions are prohibited by direct user instruction. The repository has no workflow files, repository Actions are disabled, and every gate below ran locally in isolated paths. Publication uses authenticated Git/`gh` only.

## Executed gates

| Gate | Executed result |
| --- | --- |
| `npm run check` | Strict TypeScript passed; **387/387 source tests passed, zero failed/skipped**; all five distributions built. |
| `npm run pack` + `npm run test:artifacts` | **7/7 passed, zero failed/skipped**: five clean consumer installs, the packed native-web/Chromium profile, and all-five native CLI composition with four distinct split peers. |
| Original-validator migration run | `DSH_TEST_LEGACY_ROOT=/home/dev/dev node --test test/migration/*.test.ts`: **138/138 passed**, including the untouched original config-only validators, without installing host or predecessor packages. |
| Native stock web (packed) | Port `32839`; **context, retry, chime and goalWait all active**. One product card with four settings sections; the native-served client equals the installed client after only native source-map/concatenation normalization; `3.5` seconds saved as `3500` ms; retry `enabled=false` and rest mode persisted across a full reload; disabling chime disposed its runtime while the settings sections remained; **zero console errors and page exceptions**. |
| Split artifacts | Five genuine manifest/import/CLI/checksum/payload checks in clean consumers; non-chime payloads omit chime audio; four split peers compose without the combined row. |

The accepted runtime and test trees are `src=41536169ea3711581056316fdd6dd60cead8f5be`, `client=7e9fbf4c00fdb07e86c1c36896bf78f3d52e1741`, `scripts=67e04f89c0121f8e508f84ce0aeb756852ec29e8` and `test=f1abf038ea2117c53a260bee4c7194ab595ed627`. Evidence-only documentation is not packed into any tarball, so later commits do not alter these trees or the accepted artifacts. [Native execution details](NATIVE_PROFILE_VALIDATION.md) record the packed profile gate separately.

## Independent review

Independent Standards and Spec reviews ran against the frozen contract and the acceptance matrix; every identified blocker was fixed before the accepted tree. The post-review delta is limited to native test-fixture repairs, the product identifier change and documentation, and the complete suite above was re-executed on the exact tree identified here. Neither reviewer claimed the parent's native filesystem or browser executions as their own.

## Predecessor sources and no local installation

Predecessor repositories were read only: context `22173d1`, retry `c100ff3` and chime `88f17e3` remain clean, and conventional gate `62662dc` retains its pre-existing README and untracked research/patch-check files. No predecessor package was built, installed or modified.

Nothing in this release was installed into the author's active DSH profile, and that profile was not an acceptance target; this report therefore makes no claim about its byte-level contents. The live GUI on port 3080 was never used as a test target.

## Boundaries

- The full-profile gate makes no external provider request: actual compaction transactions use a deterministic offline LLM adapter inside genuine native engines.
- The packed native test proves installation, composition, client loading, native configuration persistence and runtime disposal. It does not by itself prove a model-driven compaction request or a real legacy-to-Extras migration; those are covered by the integration and migration suites described above.
- Browser audio still obeys permission and autoplay rules, and a legacy chime handover requires a fresh host process and a full page load because disconnected old closures cannot be acknowledged.
- Native management concurrency is not advertised as universally atomic: conflicts fail closed and require inspection and retry.
- No npm publication and no production-profile installation are part of this release.

## Exact accepted artifacts

```text
1ab0a488d7ceb715762dec3657d21b31a6208f918514511e02185ae2a3022240  dsh-extras-0.1.0.tgz
bee65735472238900eb18304f3409ff85a578b53230b8056c33eab466a95fff2  dsh-extras-compact-context-0.1.0.tgz
c58686cd30eddfa4f13bf60d2de0c0f82527c71cd7ae9bc27b49fe96aa33c704  dsh-extras-retry-0.1.0.tgz
55d567bdcdb37d50be637d902f2206b00ad807a7e5502481a56babd09852d046  dsh-extras-chime-0.1.0.tgz
9063ead7eee14d646e8afb4a207be9e1d9e8a3af2519a59d17161d373fb8fc2e  dsh-extras-goal-wait-0.1.0.tgz
```
