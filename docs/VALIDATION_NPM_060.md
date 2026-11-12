# Extras0.6.0 — published npm rc.2 validation

In progress. This record distinguishes actual npm evidence from the historical source-built preview and does not preclaim pending full-suite/network gates. Apply the [pre-implementation npm contract](<DSH_RC2_NPM_060.md>) and every retained rc.2 safety gate.

## Observed official registry and installation

On2026-11-12 a fresh query of https://registry.npmjs.org returns exact @deepseek-ai/dsh0.2.2-rc.2 with tarball https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.2.2-rc.2.tgz, SHA1ff003ca75f37975c40b800fb925df70b38841fd4 and SRI `sha512-J727r2C471x2cYXGjqZ0D9T1ZyaYQDFH/Ynx8iq+85oslM4nky5YTBnbAuTtxMhW7nhY8wuAEfjjFCQ+K6Swgw==`. Registry metadata alone is not runtime proof.

Parent independently created a new disposable package and real npm lock with only exact @deepseek-ai/dsh0.2.2-rc.2, then ran `npm install --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org`. All HOME/DSH_HOME/profile/XDG/cache/TMPDIR variables were explicit. **669 packages installed, exit0,6m**. No lifecycle rebuild or byte patch was needed. Actual installed CLI `--version` returned0.2.2-rc.2; `--profile isolated --from-default-profile web --dump-config` passed, exit0. None of these commands target production.

Actual installed Goal driver compiled index SHA256 is `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`, byte-identical to the recorded canonical-source driver. An independent research lane also verified the shipped source index and prompt hashes and unchanged observer/caller coordinates. Therefore no runtime digest/frame guard is widened. Unknown/changed bytes still refuse. The installed public lock records real Goal SRI `sha512-EJEm/Ub72TBXnrFod5PCp0fLkloantPaJzp+Zn8GvayZoM1kFTrg+EZiUxbU1dfMi/vg/rj91/MvV3jzuvJg5w==`.

The prior day’s full-source disposable checkout is no longer present. This run does not pretend to have re-read or rebuilt it: the npm distribution itself includes src files, and the committed earlier hashes/reports are the historical comparison basis. Registry manifests omit gitHead; byte equality and source counterpart attribution are not a claim that registry metadata authenticated a Git revision.

## Pending owner gates

- New exact public development lock, read-only physical-graph preflight and public CLI refusal tests; independent fresh npm ci reproduction.
- Full typecheck/source suite against actual npm packages; six newly built final0.6.0 archives through all54 packed/native/whole-GUI cases.
- Independent Standards/Spec reviews; scoped commits, clean main/new annotated tag and seven freshly downloaded verified release assets.

Production profile manifest and patch SHA256 were re-recorded at task start and match the preceding release’s fingerprints. No production DSH installation/restart/live GUI use, no GitHub Actions or Extras npm publication is authorized.
