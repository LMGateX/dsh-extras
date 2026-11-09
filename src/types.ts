/** Canonical capability identifiers, independent of a distribution's install shape. */
export const LEGACY_MODULE_IDS = ['compact-context', 'retry', 'chime', 'goalWait'] as const;
export type LegacyModuleId = typeof LEGACY_MODULE_IDS[number];
export const MODULE_IDS = [...LEGACY_MODULE_IDS, 'model-policy'] as const;
/** New capabilities must require explicit opt-in, including schema-less/status paths. */
export function moduleDefaultEnabled(id: ModuleId): boolean { return id !== 'model-policy'; }
export type ModuleId = typeof MODULE_IDS[number];
export interface CapabilityStatus {
  phase: 'disabled' | 'active' | 'standby' | 'handover' | 'unavailable';
  reason?: string;
}
/** A real journal import, never inferred from current setting bytes. */
export interface LegacyAdoptionReceipt { readonly operationId: string; readonly sourceModuleId: LegacyModuleId }
export interface FeaturePlugin {
  readonly name: string;
  readonly inject?: readonly string[] | Record<string, unknown>;
  readonly Config?: unknown;
  apply(ctx: any, config?: any): unknown;
  /** Selected distribution settings remain accessible when feature participation is disabled. */
  mountSettings?(ctx: any, distributionName: string, isActive?: () => boolean, getConfig?: () => Record<string, unknown>): unknown;
  /** Same root settings owner; called only after a verifiable imported journal is adopted. */
  onLegacyAdopted?(ctx: any, acceptedModuleConfig: Record<string, unknown>, receipt: LegacyAdoptionReceipt): unknown;
  /** Side-effect-free, non-secret capability state for this exact mounted fiber. */
  runtimeStatus?(ctx: any): { capabilities: Record<string, CapabilityStatus>; details?: Record<string, unknown> };
}
export interface Distribution {
  readonly name: string;
  readonly moduleIds: readonly ModuleId[];
  readonly modulePlugins: Partial<Record<ModuleId, FeaturePlugin>>;
}
export interface ModuleState {
  phase: 'active' | 'disabled' | 'missing-dependency' | 'migration-pending' | 'conflict' | 'failed';
  reason?: string;
  capabilities?: Record<string, CapabilityStatus>;
  /** Read-only non-secret feature diagnostics; present only for the exact active fiber. */
  details?: Record<string, unknown>;
}
