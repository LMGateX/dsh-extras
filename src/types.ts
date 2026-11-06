/** Canonical capability identifiers, independent of a distribution's install shape. */
export const MODULE_IDS = ['compact-context', 'retry', 'chime', 'goalWait'] as const;
export type ModuleId = typeof MODULE_IDS[number];
export interface CapabilityStatus {
  phase: 'disabled' | 'active' | 'unavailable';
  reason?: string;
}
export interface FeaturePlugin {
  readonly name: string;
  readonly inject?: readonly string[] | Record<string, unknown>;
  readonly Config?: unknown;
  apply(ctx: any, config?: any): unknown;
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
