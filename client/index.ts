/** Source-consumer facade; emitted distributions import the explicit composition seam. */
import { createExtrasClient as composeExtrasClient } from './composition.ts';
import type { ExtrasClientDescriptor, ChimeAdapterFactory } from './composition.ts';
import { createReasoningAdapter } from './reasoning-settings.ts';
export { mountChimeController } from './composition.ts';
export type { ChimeAdapter, ChimeAdapterFactory, ExtrasClientDescriptor } from './composition.ts';

export function createExtrasClient(descriptor: ExtrasClientDescriptor, React: any, makeChime?: ChimeAdapterFactory) {
  return composeExtrasClient(descriptor, React, makeChime, createReasoningAdapter);
}
