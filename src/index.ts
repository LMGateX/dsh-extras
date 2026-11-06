/** Combined source entry. Release builds select modules from this same source. */
import { createExtrasPlugin } from './runtime.ts';
import * as compactContext from './modules/compact-context/index.ts';
import * as retry from './modules/retry/index.ts';
import * as chime from './modules/chime/index.ts';
import * as goalWait from './modules/goal-wait/index.ts';
const plugin = createExtrasPlugin({name: 'dsh-extras', moduleIds: ['compact-context', 'retry', 'chime', 'goalWait'], modulePlugins: { 'compact-context': compactContext, retry, chime, goalWait}});
export const name = plugin.name;
export const inject = plugin.inject;
export const Config = plugin.Config;
export const apply = plugin.apply;
