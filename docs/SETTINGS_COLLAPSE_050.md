# Settings collapse — 0.5.0

Implements the settings portion of [the approved workspace contract](WORKSPACE_POLICY_050.md) at its confirmed emitted/packed public rendering seam.

## Behavior and ownership

- Two disclosure levels: module, then responsibility. Compact-context separates agent tools, shared reasoning, guidance, retries/timeouts and pressure. Model policy separates workspace defaults from shared compaction reasoning. Retry separates response classification from native provider policy when that editor is available. Goal wait and the preserved chime editor each have a responsibility group.
- Initially expanded, preserving existing discoverability. Expand all / Collapse all apply only to the currently mounted settings view, including nested groups. Visibility state is ephemeral UI state; it is not runtime configuration, local storage or a profile preference.
- Native buttons provide Enter/Space activation, aria-expanded and aria-controls. Closing a body containing keyboard focus returns focus to its disclosure. Hidden bodies use the HTML hidden attribute, remain mounted, retain their exact controls/drafts and keep form/locale subscriptions. No animated height or delayed focus transition.
- Module headers retain the saved enable intent, native enable control where owned by Extras, runtime status, dirty and error summaries. Chime keeps its single original enable editor inside its responsibility group; its saved enable intent remains visible in the header. Saved intent is explicitly distinct from observed activation. Nested group summaries stay visible when that group is collapsed.
- Summaries observe the mounted editor DOM read-only: explicit data-extras-dirty=true markers from new editors, preserved English/Chinese Discard action availability for older editors, and role=alert diagnostics. They do not infer accepted configuration from a draft, submit forms, write policy or create editor copies. Mutation observers disconnect on unmount. The legacy fallback is limited to the existing English/Chinese editor contract; new editors should expose the explicit marker.
- Every original data-module/data-group/data-field selector and direct section > h3 remains; existing fieldsets, legends and custom editors remain intact. New selectors are data-collapse-group, data-collapse-body, data-collapse-summary and data-saved-enable.
- Shell-scoped native theme tokens style new buttons, visible bodies and summaries in light/dark and narrow layouts. Text follows the native optional locale service, with Chinese fallback. Technical values and unsaved drafts are never translated.

## Renderer integration

The existing first seven createSettingsView arguments are unchanged. Optional argument eight is the model-policy editor and argument nine the native retry editor. Each receives its bound form, runtime and rowId; shared reasoning additionally receives moduleId so the model-policy and compact-context entry points address the same canonical authority. New model-policy enable intent defaults false. Missing model editor reports unavailable and never falls through to chime.

Summary-only cards remain hook-free: no context creation, editor allocation, form access or subscriptions. Collapse context is acquired lazily by page components.

## Evidence

The focused browser test builds a disposable emitted browser bundle and separately executes the actual lib/client.js extracted from built tarballs, verifying equality with emitted distribution output. Public host-service fixtures are offline; no live GUI/native profile is used. The HTTP server binds 127.0.0.1 port 0. Browser, build and pack subprocesses receive explicit temporary HOME/DSH_HOME/XDG/cache/tmp paths; no installation is performed.

Tracer slices were individually observed red then green in Chromium: missing module disclosure; missing nested/bulk disclosures; missing dirty/error summary while a collapsed editor receives a revision conflict; unthemed bulk controls; missing optional model/retry renderer slots. Checks include DOM node identity, draft values, unchanged subscriptions while hidden, keyboard activation, focused-editor recovery, zero writes, Chinese/English switching, 360px light/dark geometry, and subscription cleanup. The packed combined scenario additionally exercises compact-context, goal-wait and original chime drafts. These checks do not claim actual provider execution or live-host integration.

Run with an existing read-only Chromium executable:

```sh
S=$(mktemp -d /tmp/dxp-collapse-run-XXXXXX)
HOME="$S/home" DSH_HOME="$S/dsh" DSH_PROFILE=collapse TMPDIR="$S" \
DSH_EXTRAS_CHROMIUM=/path/to/existing/chrome-headless-shell \
node --experimental-strip-types --test test/client/collapse-browser.test.ts \
  test/client/forms.test.ts test/client/settings-presentation.test.ts
```

At this scoped handoff: all emitted and actual packed combined/retry collapse scenarios passed (2/2 browser tests), and all 29 existing form/presentation assertions passed. The packed combined scenario preserves compact-context, goal-wait and original chime drafts as well as retry; hidden retry revision conflicts continue to appear without writes. The browser fixture intentionally leaves newly integrated native policy APIs unavailable, so their independent diagnostic alerts may also be included in header totals. Public optional renderer-slot checks use injected components; actual model/retry/shared policy save semantics remain covered by their dedicated lanes. Earlier attempts recorded missing concurrent client imports/status type mismatches; the final build-and-pack run succeeded after those lanes landed. Full six-consumer/native-host release acceptance remains the integration owner’s separate gate.

The original lightweight form oracle was extended to model the additional React hooks and nested children. With explicit parent approval, its two module selectors now distinguish section[data-module] from responsibility sections, matching the browser seam; all expected module lists and business assertions remain unchanged. Its summary-only no-hooks guard remains unchanged. A final additional emitted red/green slice verifies that an explicit clean marker overrides an always-available legacy Discard action; the final frozen packed rerun is delegated to the integration owner under the shared build lock.
