# DSH 0.2.2-rc.1 compatibility contract — Extras 0.4.0

Fixed before implementation, 2026-11-07 (Asia/Shanghai). The user requests isolated/subagent validation and adaptation to the official [DSH release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.1), then push and release, explicitly without local production installation.

## Evidence and scope

The official release announces Cordis Core 4.1.0, Loader/Include 1.1.0 and unified Fiber configuration access, step-aware tools.resolve/executable and prompt assembly changes, pinned agent.model selection instead of routing changes in agent/request, asynchronous projection registration and new native/PTC execution plugins. Registry metadata for [the exact published DSH package](https://registry.npmjs.org/@deepseek-ai/dsh/0.2.2-rc.1) confirms that version and its synchronized host package dependencies. Extras 0.3.1 explicitly pins alpha.3, including native goal-driver artifact identity and compaction-reasoning runtime checks; replacing version strings without auditing those contracts is insufficient.

## Required behavior

- Target exact DSH 0.2.2-rc.1 and its actual published Cordis/Loader packages in all five synchronized 0.4.0 distributions. This is a new audited host baseline, not a broad semver claim. Alpha.3 users retain Extras 0.3.1; no silent compatibility claims for untested host versions.
- Preserve module behavior, canonical tool names, source selection, migration precedence/recovery/process-owner safety, actual settings persistence and ordinary Goal activation/replacement/native/off strategies. Keep default-off reasoning control and native model routing/retention/retry authority.
- Adapt to real rc public APIs rather than adding another runtime or bypassing native admission. Refresh exact-artifact proofs only after comparison with official package source; unknown/mismatched runtime and foreign owners must still fail closed. Port any necessary native-driver behavioral changes with provenance and MIT notices.
- Existing baseline, REASON, PAR and CLI acceptance remain required. Legacy sources incompatible with the new host must have their historical behavior validated separately rather than being silently treated as runtime-compatible. Any necessary boundary change requires a documented evidence-based amendment before implementation.

## Additional release gates

- RC-1: independent primary-source audit documents all changed integration seams and exact versions/artifact hashes.
- RC-2: full typecheck and source tests execute against rc.1 in disposable HOME/DSH_HOME/XDG/cache/profile paths, including native tool visibility and execution, prompt placement, PTC, retry, scoped compaction and all reasoning entry paths.
- RC-3: exact native Goal/Loader ownership, wait/release/revocation/unload and four-strategy transitions execute against rc.1; unknown-version/artifact/foreign ownership refusal remains tested.
- RC-4: all five packed clean consumers, absent-peer CLI/API and anchored migration/recovery/runtime cases execute; no second Cordis registry, local secrets or sandbox payloads ship.
- RC-5: actual packed native web plus isolated Chromium exercise settings persistence, module toggles and chime handover. Do not touch the live GUI or imply browser coverage from a source-only harness.
- RC-6: independent standards/spec review, complete validation record, scoped commits, clean pushed main, annotated tag, five release archives plus checksums and remote download verification. No GitHub Actions or npm publication.

## Safety

Use dedicated Git worktrees and only disposable explicit install/host homes. Original source repositories and real DSH home/profile stay unchanged. Do not install this release into the developer production profile, restart the real host or target its GUI.
