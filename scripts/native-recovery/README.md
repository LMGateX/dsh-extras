# Unofficial native recovery host staging

These commands are a version-pinned offline companion to the [approved native extension contract](<../../docs/NATIVE_RECOVERY_050.md>), **not** an official DSH release, production installer, or authorization to replace the running host.

## Inputs and invariants

- Exact candidate implementation commit: `2121312aacce481d2970ae582fdfc9a3056039ca`. Baseline tag: `dsh-v0.2.2-rc.1`.
- Only the five top-level manifest-named archives are inputs: agent, agent-loop, session, llm-retry and goal. Their versions and inter-owner production dependency/peer ranges must all be `0.2.2-rc.1-native-recovery.0`; packages must be private and explicitly unofficial. Never use intermediate raw packs.
- A complete read-only stock DSH root at 0.2.2-rc.1 and Cordis 4.1.0 is copied with `cp -a --reflink=auto` into a newly allocated directory under `/tmp`. No global installation, symlink of the entire dependency graph, profile copy, source-host edit, or existing Extras build is performed. All dependency symlinks must remain inside the copied host.
- Five archive SHA256/SHA512 and emitted entry hashes are checked before/after overlay. The CLI root version is deliberately retained as the stock baseline; a `dshExtrasNativeRecovery` field labels the actual adaptation and provenance.
- Stock Goal round driver entry SHA256 remains `1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de`. Verification also compares the whole driver package tree, stock LLM/compaction/Cordis runtime bytes and versions, source-host before/after fingerprints, and candidate-vs-source inode independence.

## Reproduce

Use Node 24, GNU cp and tar. Set `CANDIDATE` to the directory containing the verified top-level archives and its packager manifest, and `STOCK_DSH_ROOT` to the read-only stock CLI package root (not its parent scope).

```sh
node scripts/native-recovery/stage.mjs "$CANDIDATE" "$STOCK_DSH_ROOT"
# The JSON result prints prefix, host, anchor, wrapper and manifest paths.
# Set PREFIX to that newly printed prefix.
node scripts/native-recovery/verify.mjs "$PREFIX"
DSH_NATIVE_RECOVERY_PREFIX="$PREFIX" node --test scripts/native-recovery/check-stage.test.mjs
T=$(mktemp -d /tmp/dsh-native-candidate-profile.XXXXXX)
HOME="$T/home" DSH_HOME="$T/dsh" node "$PREFIX/bin/dsh-unofficial.mjs" --version
# Application launch: use a disposable native profile and explicit --port 0
# (or another non-3080 temporary port). Do not start a replacement GUI.
```

[stage.mjs](<stage.mjs>) produces a manifest, a separately retained candidate manifest, a README and a warning-printing wrapper in the new prefix. [verify.mjs](<verify.mjs>) writes a verification report there. Temporary hosts, archives, manifests/reports with local paths, profiles and cache state remain outside Git.

The wrapper always identifies the unofficial suffix even though native CLI version output retains the baseline. It requires explicit disposable HOME and DSH_HOME under `/tmp`, checks real ancestors before creating them, refuses port 3080 and implicit application ports, and places cache state under disposable HOME. This wrapper is a controlled-test convenience guard, not an arbitrary-argument security sandbox.

## Evidence and limits

[probe-agent.mjs](<probe-agent.mjs>) loads only emitted modules from the supplied host anchor and checks one physical Cordis Context identity across the five owners plus stock Goal driver, LLM and compaction. Through public Agent/LLM interfaces with only deterministic external transport substituted, it causes one genuine terminal failure, reads an eligible process-local recovery checkpoint, retries the exact request once, and proves duplicate-operation idempotence, fresh AbortSignal and no added model-visible messages. This exact probe is red on the stock host (missing recovery surface) and green on the staged candidate.

[check-stage.test.mjs](<check-stage.test.mjs>) exercises those public commands and rejects false official identity, changed archives, emitted owner drift, and dependency links back to the original installation. Verification is not real Extras HTTP owner/origin admission, packed-browser acceptance, external allNativeWakeAdmission intent compatibility, or production authorization; those are separate parent-coordinated gates.

**Do not reuse a real/stock profile.** The candidate introduces required failure/recovery events; stock readers intentionally cannot read candidate logs. The exact request snapshot is process-local, not durable restart recovery. Rollback means stop only the isolated candidate and restore the separate disposable profile backup; never strip audit events or downgrade a live profile in place.
