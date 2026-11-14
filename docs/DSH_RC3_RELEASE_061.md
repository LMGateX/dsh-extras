# Extras 0.6.1 publication authorization and final-artifact gate

Fixed before release-identity edits, 2026-11-14 (Asia/Shanghai). After completed isolated rc.3 compatibility checking, the user explicitly requests “push、发版 暂时不为本机 dsh 安装”. This authorizes push of the scoped work to main, an annotated v0.6.1 tag and a final GitHub Release; it does not authorize production installation, update, configuration writes, restart or live-GUI tests. No GitHub Actions or Extras npm publication.

## Scope and evidence

The [original rc.3 contract](<DSH_RC3_061.md>) and [candidate validation](<VALIDATION_RC3_061.md>) remain historical records, including their then-correct no-publication boundary. This follow-up supersedes only that publication restriction and the candidate identity. Exact official npm DSH0.2.2-rc.3 / Cordis4.1.0, compiled Goal digest, ownership guards, native policy and six synchronized distributions remain unchanged. Current clean candidate HEAD is35bae9759ce9a677d51e14218574737419f93c54; tested product source is2012b6e78b92e6e6b2c84b4b16dbefbdcdb6f3d7, with751/751 source and54/54 packed tests already executed.

Remote main was observed at1b4b9a2c15be6293b5d92f1820ce811904938d93 and v0.6.1 was absent. Historical v0.6.0 and v0.6.0-rc.1 tags/releases must remain untouched. Do not force-push over concurrent work, move an existing release tag or replace old assets.

## Final publication gates

1. Change current README/install instructions and active development/spec navigation to final0.6.1 / exact rc.3, while preserving historical records. Add packed assertions for final identity and correct v0.6.1 URL. No runtime or dependency changes are needed. Because README is shipped, rebuild/repack all six final archives and re-execute the complete packed/native/browser suite including six real GUIs. Run host preflight/typecheck/full source against the retained exact official npm graph in fresh disposable state; no duplicate upstream clone or source rebuild.
2. Record final tested commit, actual commands/counts/log and six archive/manifest hashes. Obtain independent Standards and Spec follow-up reviews. Static review and execution evidence stay distinct. No predicted pass or network receipt.
3. After passing gates, make a clean scoped release record commit; atomically fast-forward remote main and push a new annotated v0.6.1 tag at the same commit. Publish only six final tarballs and SHA256SUMS as a non-draft, non-prerelease Latest release.
4. Download all seven actual remote assets to a new temporary directory. Verify byte equality against tested local files, checksums, sizes, package identities/version/engines and safe tar contents; verify remote main, tag target, release flags and Latest identity. Append a postpublication receipt to the GitHub release body without changing tested source/tag identity.

## Production and personal-profile boundary

No production operation is authorized. All build/test/native installs use explicit disposable HOME/DSH_HOME/profile/XDG/cache/TMP and non3080 ports. Close all owned test processes and verify worktree/isolated resources without accessing production settings.

The prior live-profile hash drift is preserved in its historical validation and is not retrospectively marked passed or assigned to a writer. The user explicitly directed that personal configuration is unrelated to this Git work and asked to focus on the repository, then authorized publication. Therefore this release uses the enforceable **agent operation and disposable-fixture boundary**, not a claim that the concurrently mutable personal profile must equal a historical hash. This clarifies the earlier RC3-SAFE hash-comparison evidence requirement for this follow-up; it does not authorize any production write, restore, investigation, instrumentation, installation or restart, nor erase the observed limitation. Do not re-open that personal-profile question or claim an unchanged production fingerprint.
