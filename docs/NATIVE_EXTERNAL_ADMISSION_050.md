# External admission — isolated native recovery evidence

2026-11-09 (Asia/Shanghai). Supplemental spec-review evidence against native implementation
`2121312aacce481d2970ae582fdfc9a3056039ca` and reference supplement
`320b72c02a1bc8c98cdd66aa70ad26059c1a0bad`, from official baseline
`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`. This is not production installation, whole-GUI acceptance, or management-enabled capacity/admission coverage.

## Actual boundary exercised

[The explicit acceptance probe](../test/native-recovery/external-admission.acceptance.ts) copies only the actual external plugin's code and package manifest into a disposable directory. It verifies copied host/runtime hashes, resolves every native peer from the candidate stage, and asserts a single Cordis identity. No installed plugin entry is loaded directly and no live profile/configuration is read or written. Network fetch is prohibited.

The probe calls the actual external public `mountHost` and `createRuntime` implementations, mounting their real pre-step listener over native candidate Agent/loop/retry, persistence/query, working-directory, subagent, workspace, JSON storage-domain, Typert and connection services. A forwarding observer records only the public preStep result without replacing its behavior. Thus this is an actual native Agent recovery chain, not a mocked listener or a snapshot-only unit test.

Both cases explicitly assert extension enabled, workspace management OFF, and `allNativeWakeAdmission=supported`:

- **Unchanged visible snapshot:** original pre-step contributes one real external snapshot; recovery receives zero messages and returns zero additional messages. Exactly one additional native request dispatches, matching the failed request except for its fresh signal. No synthetic user/developer/system message is appended.
- **Changed external snapshot:** a saved external display-policy revision changes after failure, while management remains OFF. Actual external preparation returns a snapshot despite management being OFF. Native recovery rejects with `recovery-policy-rejected` before provider dispatch; the original request count stays one and no synthetic message is appended. This is legitimate fail-closed behavior under [the approved changed-input/admission rules](NATIVE_RECOVERY_050.md#required-semantics), not a bypass or a universally working action.

Result: **1 test / both cases pass, exit 0**. Repeated isolated runs produced the same outcomes. Disposable roots are retained and printed as evidence; they contain synthetic data only.

## Code identity

External package: `@lmgatex/dsh-mattpocock-skills@0.17.0`.

| Copied code | SHA-256 |
| --- | --- |
| Host adapter entry | `2a569b2a90734e21439c240bcad053de6a7b63f4c083276889ef18904085db54` |
| Runtime implementation entry | `818a39382a92105220f9158f5647ffc2055c5736a3ca59d2138bc4f9d05abed9` |

The native source review independently reran 20 focused recovery/disposition tests, plus three temporary public-interface probes: finite-five renewal is six exact requests; nonretryable normal failures create no checkpoint; always-mode retry creates no terminal checkpoint. The source patch passes `git apply --cached --check` against the official baseline using a temporary index; SHA-256 `669096a94cd29c27c8dcc3de1002292bdb10d6f8a1664c2f61a59608d90948cb`.

## Reproduction

From the Extras worktree, with the already assembled unofficial native candidate and read-only external package:

```sh
T=$(mktemp -d /tmp/external-native-admission-XXXXXX)
HOME="$T/home" DSH_HOME="$T/dsh" DSH_PROFILE=isolated TMPDIR="$T" \
XDG_CACHE_HOME="$T/cache" \
DSH_EXTERNAL_PLUGIN_ROOT=/explicit/read-only/plugin-package \
DSH_RECOVERY_CANDIDATE_ANCHOR=/tmp/dsh-native-recovery-stage-b70lEZ/node_modules/@deepseek-ai/dsh/package.json \
node --experimental-strip-types --test test/native-recovery/external-admission.acceptance.ts
```

The tested package root was the installed 0.17.0 package supplied explicitly for read-only code inspection; use its package directory, never a personal configuration directory. The filename deliberately ends in `.acceptance.ts` so default `.test.ts` inventory does not silently run or skip this optional gate. No builds, installs, production port, live GUI or management enablement are required.
