# Source provenance and development safety

Feature sources are MIT licensed local predecessor repositories. Preserve their notices and original authors in the final distribution. Chime includes CC0 Kenney Interface Sounds; preserve its THIRD_PARTY_NOTICES and required asset metadata.

Initial source commits (read-only):
- dsh-tool-compact-context 0.4.7: 22173d10f128bcee986cf45eb9ea36b623f664f2
- dsh-stream-retry 0.1.9: c100ff32b6228a81a69778f10e9a3d1f172160d6
- dsh-session-chime 0.6.0: 88f17e3945063e35d77964812ffa201e4bcbb948
- dsh-goal-wait-gate 0.3.0: 62662dc2b92f415f451f1c362535617e23f445d7

The gate source checkout already had local README/research/untracked changes. They are outside this task and must remain untouched. Only tracked feature source needed by the conventional gate is ported.

Audited development host package: @deepseek-ai/dsh 0.2.2-alpha.3, read-only. It is not modified or used to install Extras into the active profile.

Private production-profile integrity baselines remain in ignored disposable verification state, never in source or release assets. Validation reports record only the sampled-file count and whether the before/after comparison passed; they do not disclose profile contents, paths or hashes.
