import z from '@deepseek-ai/schemastery';
export {resolveConfig, validateConfig, selectionFor} from './policy.ts';
export type {ResolvedConfig, WorkspaceOverride, ModelSelection} from './policy.ts';
const id = () => z.string().min(1).max(200).pattern(/^[^\u0000-\u001f\u007f-\u009f]+$/u);
const selection = () => z.union([z.const(null),z.object({provider:id().required(),model:id().required(),reasoningEffort:z.union([z.const(null),id()])})]);
const rule = z.union(['all','provider','provider-model'].flatMap(scope => ['inherit','fixed'].map(mode => z.object({scope:z.const(scope).required(),mode:z.const(mode).required(),...(scope === 'all' ? {} : {provider:id().required()}),...(scope === 'provider-model' ? {model:id().required()} : {}),...(mode === 'fixed' ? {effort:id().required()} : {})}))));
/** Native ConfigForm supports structured arrays, no JSON textarea or path-keyed opaque map. */
export const Config: Schemastery<any,any,any> = z.object({
 enabled:z.boolean().default(false).volatile(),
 root:selection().default(null).description('Root model default / 根代理模型默认值').volatile(),
 descendants:selection().default(null).description('All descendant model defaults / 所有后代模型默认值').volatile(),
 workspaceOverrides:z.array(z.object({workspaceId:id().required(),root:selection(),descendants:selection()})).max(100).default([]).description('Workspace overrides / 工作区覆盖').volatile(),
 compactionReasoning:z.object({enabled:z.boolean().default(false),rules:z.array(rule).max(100).default([{scope:'all',mode:'inherit'}])}).default({}).volatile(),
});
