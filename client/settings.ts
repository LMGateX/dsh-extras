/** Source-consumer facade. Production entries explicitly compose selected feature sources. */
import { createSettingsView as composeSettingsView } from './settings-core.ts';
import type { SettingsDescriptor, SettingsStatusStore } from './settings-core.ts';
import { createReasoningSettingsView } from './reasoning-settings.ts';
import type { ReasoningCatalogSource } from './reasoning-settings.ts';
import type { SettingsLocale } from './settings-ui.ts';
export { createFieldEditor } from './settings-core.ts';
export type { ModuleId, SettingsDescriptor, SettingsStatus, SettingsStatusStore, SettingsProps } from './settings-core.ts';
export type { ReasoningCatalogSource } from './reasoning-settings.ts';

/** Preserve the public source settings interface, including its optional native catalog. */
export function createSettingsView(
  React: any, descriptor: SettingsDescriptor, chimeEditor?: unknown, status?: SettingsStatusStore, catalog?: ReasoningCatalogSource, locale?: SettingsLocale,
) {
  return composeSettingsView(React, descriptor, chimeEditor, status,
    descriptor.moduleIds.includes('compact-context') ? createReasoningSettingsView(React, catalog, locale) : undefined, undefined, locale);
}
