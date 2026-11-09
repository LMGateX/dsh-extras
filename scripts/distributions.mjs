/** Distribution selection is the sole packaging source of truth. */
export const distributions = [
  { name: 'dsh-extras', modules: ['compact-context', 'retry', 'chime', 'goalWait', 'model-policy'] },
  { name: 'dsh-extras-compact-context', modules: ['compact-context'] },
  { name: 'dsh-extras-retry', modules: ['retry'] },
  { name: 'dsh-extras-chime', modules: ['chime'] },
  { name: 'dsh-extras-goal-wait', modules: ['goalWait'] },
  { name: 'dsh-extras-model-policy', modules: ['model-policy'] },
];
export const sourceDirectories = { 'compact-context': 'compact-context', retry: 'retry', chime: 'chime', goalWait: 'goal-wait', 'model-policy': 'model-policy' };
export const clientDependencies = {
  'compact-context': ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-api-remotes'],
  retry: ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-api-session-controller'],
  'model-policy': ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-api-remotes'],
  chime: ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-api-job-controller', '@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-session', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager'],
  goalWait: ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager'],
};
