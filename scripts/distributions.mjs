/** Distribution selection is the sole packaging source of truth. */
export const distributions = [
  { name: 'dsh-extras', modules: ['compact-context', 'retry', 'chime', 'goalWait', 'model-policy', 'host-timezone'] },
  { name: 'dsh-extras-compact-context', modules: ['compact-context'] },
  { name: 'dsh-extras-retry', modules: ['retry'] },
  { name: 'dsh-extras-chime', modules: ['chime'] },
  { name: 'dsh-extras-goal-wait', modules: ['goalWait'] },
  { name: 'dsh-extras-model-policy', modules: ['model-policy'] },
  { name: 'dsh-extras-host-timezone', modules: ['host-timezone'] },
];
export const sourceDirectories = { 'compact-context': 'compact-context', retry: 'retry', chime: 'chime', goalWait: 'goal-wait', 'model-policy': 'model-policy', 'host-timezone': 'host-timezone' };
export const clientDependencies = {
  'host-timezone': ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-client-modules', '@deepseek-ai/dsh-api-session-controller'],
  'compact-context': ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-api-workspace-controller'],
  retry: ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-api-session-controller'],
  'model-policy': ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-api-workspace-controller'],
  chime: ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-api-job-controller', '@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-session', '@deepseek-ai/dsh-client-ui-session-status', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager'],
  goalWait: ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-plugin-manager'],
};
