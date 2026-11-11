# DSH Extras v0.6.0-rc.1 — DSH rc.2 source-built preview

**Prerelease, explicitly limited to the verified official-tag source build.** All six distributions use version `0.6.0-rc.1`. This is not certification of unobserved npm rc.2 artifacts, and is not an automatic upgrade recommendation for stable rc.1 installations. Extras itself is not published to npm.

## Verified host boundary

- Official DSH `0.2.2-rc.2` tag commit: `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`.
- Node `>=24.9.0`; native Cordis `4.1.0`.
- The unchanged tag was built once using its frozen pnpm lock and canonical artifact graph; all8 host/client/Web gates passed. Every lane used that complete local checkout, not incremental web code-page queries or replacement live hosts.
- Audited source-built Goal driver SHA256: `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`. Source provenance, emitted lifecycle coordinates, exact Loader/root identity and ownership fences remain required. Unknown/changed driver bytes fail closed.
- Public exact rc.2 npm metadata was unavailable at verification. Local canonical output is explicitly **source-built evidence, not an observed npm digest**. Development uses a consistent toolchain-only npm lock and an explicit validated source-host linking step; it does not invent missing registry integrity or install rc.1 as a substitute.

## What changed

### Goal-wait: useful for Jobs, not a duplicate native tree barrier

Native rc.2 already joins progressing managed work for a tree root, while ordinary tree members do not join and healthy parked resident inboxes do not block. Native still does not wait arbitrary owned Jobs. Choose `native` when native managed-tree coordination is sufficient; Extras remains useful for configured generic Jobs and the preserved stricter activation policy.

All four strategies remain, with no default migration: `activation` (existing default), `replacement`, `native`, `off`. The replacement port follows exact native `waitForTreeWork`, adds configured Job eligibility without changing activation and removes only unreachable earlier-host descendant fallback. Existing cancellation, external-revocation, teardown, queue accounting and unknown-artifact refusal remain. The documented same-value external-disarm overlap limitation of activation is not claimed to be fixed.

### Native retry and honest recovery presentation

Exact rc.2 native retry Config/CAS handling is retained;25 newly audited native permanent codes cannot be reclassified into retryable TRANSPORT by custom identifier rules. Native normal retry counts, always-mode risk, cancellation and provider routing stay native.

Stock **Continue generating** submits an empty normal follow-up and records a durable retry user-message. It is not exact captured-request replay or a budget-exhaustion checkpoint. Extras leaves that native action untouched, silently omits absent optional checkpoint recovery UI and still reports an incompatible optional protocol. The historical unofficial rc.1 companion is not an rc.2 asset and must not be installed for this preview.

### Model/compaction/native fixtures

Preserve immutable public session origin/parentSession workspace provenance rather than replacing it with mutable cwd or live-membership queries. Real named spawn/fork/depth-two/cold-resume tests verify model and compaction-effort isolation. Compact-context guards target exact rc.2. Shared tests use flat native startActivation and root-filtered drainDescendants; append(array) still publishes each public session/event after committing the whole batch. One native runtime and one shared compaction executor remain.

## Validation and safety

Before prerelease identity/provisioning changes, parent-run final0.6.0 candidates passed725/725 source tests and49/49 packed tests, including disposable native CLI/Loader/migration and stock native browser runs. These are historical candidate results, not a substitute for final prerelease verification. The final prerelease counts and archives are recorded in the validation report after repacking. Both independent Standards/Spec axes are required again for the approved provisioning amendment.

All installation/host/browser work uses explicit disposable HOME/DSH_HOME/profile/XDG paths and temporary ports. **Not installed into the local production DSH; no live GUI, production restart, npm publication or GitHub Actions.**

## Assets

Combined package plus five independent splits: `dsh-extras`, `dsh-extras-compact-context`, `dsh-extras-retry`, `dsh-extras-chime`, `dsh-extras-goal-wait`, `dsh-extras-model-policy`; each archive ends in `-0.6.0-rc.1.tgz`. Verify against the accompanying SHA256SUMS. Choose the combined package or distinct splits, never overlapping ownership. No bundled native host, node_modules, personal profile, provisioning receipt, sandbox state or rc.1 companion belongs in these assets.
