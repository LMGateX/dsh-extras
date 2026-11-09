import { useSettingsText, type SettingsLocale, type SettingsText } from './settings-ui.ts';

/** Visibility only: never owns a form, writes configuration or unmounts children. */
export function createSettingsCollapse(React: any, locale?: SettingsLocale) {
  const h = React.createElement;
  // Summary-only cards never acquire React context or allocate editors.
  let Context: any;
  const context = () => Context ??= React.createContext(null);
  function Provider({ children }: { children: unknown }) {
    const [registry] = React.useState(() => new Set<(next: boolean) => void>());
    return h(context().Provider, { value: registry }, children);
  }
  function useCollapse() {
    const registry = React.useContext(context());
    const t = useSettingsText(React, locale);
    const [summary, setSummary] = React.useState({ dirty: false, errors: 0 });
    const [expanded, setExpanded] = React.useState(true);
    const body = React.useRef(null);
    const button = React.useRef(null);
    const id = React.useId();
    const change = React.useCallback((next: boolean) => {
      if (!next && body.current?.contains(document.activeElement)) button.current?.focus();
      setExpanded(next);
    }, []);
    React.useEffect(() => {
      registry?.add(change);
      return () => { registry?.delete(change); };
    }, [registry, change]);
    React.useEffect(() => {
      const element = body.current as HTMLElement | null;
      if (!element) return;
      const read = () => {
        // Explicit markers for new editors; preserved editors retain their public
        // Discard action contract. Hidden descendants remain observed/subscribed.
        const dirty = Boolean(element.querySelector('[data-extras-dirty="true"]'))
          || [...element.querySelectorAll('button:not(:disabled)')].some(node => !node.closest('[data-extras-dirty]') && /^(Discard|放弃|丢弃)/.test(node.textContent?.trim() ?? ''));
        const errors = element.querySelectorAll('[role="alert"]').length;
        setSummary((old: { dirty: boolean; errors: number }) => old.dirty === dirty && old.errors === errors ? old : { dirty, errors });
      };
      const observer = new MutationObserver(read);
      observer.observe(element, { subtree: true, childList: true, characterData: true, attributes: true });
      read();
      return () => observer.disconnect();
    }, []);
    return {
      expanded,
      summary: h('span', { 'data-collapse-summary': '', role: 'status' },
        [summary.dirty ? t('Unsaved changes', '有未保存的更改') : t('No pending draft', '无待保存草稿'),
          summary.errors ? t('Errors: ', '错误：') + summary.errors : ''].filter(Boolean).join(' · ')),
      buttonProps: { ref: button, type: 'button', 'aria-expanded': expanded, 'aria-controls': id, onClick: () => change(!expanded) },
      bodyProps: { ref: body, id, hidden: !expanded, 'data-collapse-body': '' },
    };
  }
  function Actions({ t }: { t: SettingsText }) {
    const registry = React.useContext(context());
    return h('div', { className: 'extras-actions extras-collapse-actions' },
      h('button', { type: 'button', onClick: () => registry?.forEach((change: (next: boolean) => void) => change(true)) }, t('Expand all', '全部展开')),
      h('button', { type: 'button', onClick: () => registry?.forEach((change: (next: boolean) => void) => change(false)) }, t('Collapse all', '全部折叠')));
  }
  function Group({ name, label, children }: { name: string; label: string; children: unknown }) {
    const collapse = useCollapse();
    return h('div', { className: 'extras-collapse-group', 'data-collapse-group': name },
      h('h4', null, h('button', collapse.buttonProps, label)), collapse.summary,
      h('div', collapse.bodyProps, children));
  }
  return { Provider, Actions, Group, useCollapse };
}
