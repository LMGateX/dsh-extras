/** Retry settings edit provider-owned native configuration, independently of classification. */
import {useSettingsText, type SettingsLocale} from './settings-ui.ts';
import type {RetryPolicyDraft, RetrySettingsSnapshot, RetrySettingsTarget} from '../src/modules/retry/settings.ts';
export type {RetryPolicyDraft, RetrySettingsSnapshot, RetrySettingsTarget};
export interface RetrySettingsSource {
  load():Promise<RetrySettingsSnapshot>;
  save(input:{targetId:string;expectedRevision:number;policy:RetryPolicyDraft}):Promise<RetrySettingsSnapshot>;
}
/** Same-origin owner credentials only. Never surface raw native errors or provider config. */
export function createRetrySettingsSource(distribution:string, fetcher:typeof fetch=fetch):RetrySettingsSource {
  const path='/extras/'+encodeURIComponent(distribution)+'/retry-policy';
  async function request(input?:unknown):Promise<RetrySettingsSnapshot> {
    const response=await fetcher(path,{method:input===undefined?'GET':'PUT',credentials:'same-origin',cache:'no-store',headers:input===undefined?{}:{'Content-Type':'application/json'},...input===undefined?{}:{body:JSON.stringify(input)}});
    if(!response.ok) throw new Error(response.status===409?'retry-settings-conflict':'retry-settings-unavailable');
    const value=await response.json();
    if(!value || typeof value.writable!=='boolean' || !Array.isArray(value.targets) || value.targets.length>1000) throw new Error('retry-settings-unavailable');
    return value;
  }
  return {load:()=>request(),save:input=>request(input)};
}
/** Optional source injection is the public offline/browser test seam. */
export function createRetrySettingsView(React:any, supplied?:RetrySettingsSource, locale?:SettingsLocale) {
  const h=React.createElement;
  function Provider({target,writable,source,onSaved}:{target:RetrySettingsTarget;writable:boolean;source:RetrySettingsSource;onSaved:(v:RetrySettingsSnapshot)=>void}) {
    const t=useSettingsText(React,locale);
    const [accepted,setAccepted]=React.useState(target);
    const [value,setValue]=React.useState({...target.policy});
    const [delay,setDelay]=React.useState(target.policy.initialDelayMs===target.policy.maxDelayMs&&target.policy.jitterRatio===0?'fixed':'exponential');
    const [ack,setAck]=React.useState(false);const [busy,setBusy]=React.useState(false);const [notice,setNotice]=React.useState('');
    const mounted=React.useRef(false);React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
    const dirty=JSON.stringify(value)!==JSON.stringify(accepted.policy);
    const conflict=target.revision!==accepted.revision;
    const update=(patch:Partial<RetryPolicyDraft>)=>{setValue((v:RetryPolicyDraft)=>({...v,...patch}));setNotice('');};
    const valid=value.mode==='always'||Number.isSafeInteger(value.maxRetries)&&value.maxRetries>=0;
    const numeric=Number.isFinite(value.initialDelayMs)&&value.initialDelayMs>0&&value.initialDelayMs<=2147483647&&Number.isFinite(value.maxDelayMs)&&value.maxDelayMs>=value.initialDelayMs&&value.maxDelayMs<=2147483647&&Number.isFinite(value.jitterRatio)&&value.jitterRatio>=0&&value.jitterRatio<=1;
    async function save(){
      if(busy||!writable||!valid||!numeric||conflict||value.mode==='always'&&!ack)return;
      setBusy(true);setNotice('');
      const policy:RetryPolicyDraft={mode:value.mode,...value.mode==='normal'?{maxRetries:value.maxRetries}:{},initialDelayMs:value.initialDelayMs,maxDelayMs:delay==='fixed'?value.initialDelayMs:value.maxDelayMs,jitterRatio:delay==='fixed'?0:value.jitterRatio};
      try {
        const snapshot=await source.save({targetId:accepted.id,expectedRevision:accepted.revision,policy});
        if(!mounted.current)return;
        const next=snapshot.targets.find(x=>x.id===accepted.id);if(!next)throw new Error('retry-settings-unavailable');
        setAccepted(next);setValue({...next.policy});setAck(false);onSaved(snapshot);setNotice('saved');
      }catch(error:any){
        if(error?.message==='retry-settings-conflict'){
          try{const latest=await source.load();if(mounted.current)onSaved(latest);}catch{/* Keep the stale draft fenced if refresh fails. */}
          if(mounted.current)setNotice('conflict');
        }else if(mounted.current)setNotice('unavailable');
      }
      finally{if(mounted.current)setBusy(false);}
    }
    const disabled=!writable||busy;
    const number=(key:'maxRetries'|'initialDelayMs'|'maxDelayMs'|'jitterRatio',en:string,zh:string)=>h('label',{key},t(en,zh),h('input',{type:'number','aria-label':t(en,zh),value:Number.isNaN(value[key])?'':value[key]??'',disabled,min:key==='jitterRatio'||key==='maxRetries'?0:1,max:key==='jitterRatio'?1:key==='maxRetries'?Number.MAX_SAFE_INTEGER:2147483647,step:key==='jitterRatio'?0.01:1,onChange:(event:any)=>{const n=event.target.value===''?NaN:Number(event.target.value);update(delay==='fixed'&&key==='initialDelayMs'?{initialDelayMs:n,maxDelayMs:n,jitterRatio:0}:{[key]:n});}}));
    return h('fieldset',{'data-extras-dirty':dirty,'aria-label':t('Provider '+target.provider+' ('+target.namespace+')','提供方 '+target.provider+' ('+target.namespace+')'),className:'extras-group'},
      h('legend',null,t('Provider ','提供方 ')+target.provider+' ('+target.namespace+')'),
      h('p',{role:'status'},t('Scope: this provider route in this profile, not this workspace. Disabling the Extras classifier does not disable native retries.','范围：当前配置档中的此提供方路由，并非当前工作区。关闭 Extras 分类器不会关闭原生重试。')),
      h('label',null,t('Retry mode','重试模式'),h('select',{'aria-label':t('Retry mode','重试模式'),value:value.mode,disabled,onChange:(e:any)=>{setAck(false);setValue((v:RetryPolicyDraft)=>e.target.value==='always'?{mode:'always',initialDelayMs:v.initialDelayMs,maxDelayMs:v.maxDelayMs,jitterRatio:v.jitterRatio}:{...v,mode:'normal',maxRetries:5});setNotice('');}},
        h('option',{value:'normal'},t('Normal (bounded)','普通（有限）')),h('option',{value:'always'},t('Always (unlimited)','始终（无限）')))),
      value.mode==='normal'?number('maxRetries','Additional retries','额外重试次数'):h('div',null,h('p',{role:'note'},t('Unlimited retries include permanent model-request failures and repeated billing; stop by native cancellation or disposal.','无限重试包含永久性模型请求失败并会重复计费；通过原生取消或卸载停止。')),h('label',null,h('input',{type:'checkbox',checked:ack,disabled,onChange:(e:any)=>setAck(e.target.checked)}),t('I accept unlimited retries and repeated billing.','我接受无限重试和重复计费。'))),
      h('small',null,t('Normal defaults to 5 additional attempts (up to 6 requests). Compaction-tool bounded retries are separate.','普通模式默认额外重试 5 次（最多 6 次请求）。压缩工具的有限重试是独立机制。')),
      h('label',null,t('Delay mode','延迟模式'),h('select',{'aria-label':t('Delay mode','延迟模式'),value:delay,disabled,onChange:(e:any)=>{setDelay(e.target.value);if(e.target.value==='fixed')update({maxDelayMs:value.initialDelayMs,jitterRatio:0});}},h('option',{value:'exponential'},t('Exponential ×2','指数 ×2')),h('option',{value:'fixed'},t('Fixed','固定')))),
      number('initialDelayMs','Initial delay (ms)','初始延迟（毫秒）'),
      delay!=='fixed'?number('maxDelayMs','Maximum delay (ms)','最大延迟（毫秒）'):null,
      delay!=='fixed'?number('jitterRatio','Jitter ratio (0–1)','抖动比例（0–1）'):h('small',null,t('Fixed maps initial = maximum and jitter = 0. Native provider Retry-After remains authoritative.','固定模式映射为初始=最大且抖动=0。原生提供方 Retry-After 仍具有权威。')),
      h('p',{role:'status'},conflict||notice==='conflict'?t('Configuration changed. Discard this draft before saving.','配置已更新。请先放弃草稿，再保存。'):notice==='saved'?t('Saved; future native requests use this policy.','已保存；后续原生请求将使用此策略。'):dirty?t('Unsaved native policy draft.','原生策略草稿尚未保存。'):t('Accepted provider configuration; in-flight requests keep their captured policy.','已接受的提供方配置；进行中的请求保留已捕获策略。')),
      notice==='unavailable'?h('p',{role:'alert'},t('Native retry settings unavailable; no configuration was confirmed.','原生重试设置不可用；未确认配置已保存。')):null,
      h('button',{type:'button',disabled:disabled||!dirty||!valid||!numeric||conflict||value.mode==='always'&&!ack,onClick:()=>void save()},t('Save native policy','保存原生策略')),
      h('button',{type:'button',disabled:busy,onClick:()=>{setAccepted(target);setValue({...target.policy});setDelay(target.policy.initialDelayMs===target.policy.maxDelayMs&&target.policy.jitterRatio===0?'fixed':'exponential');setAck(false);setNotice('');}},t('Discard native draft','放弃原生草稿')));
  }
  return function RetrySettings({rowId}:{rowId:string}) {
    const t=useSettingsText(React,locale);
    const source=React.useMemo(()=>supplied??createRetrySettingsSource(rowId),[rowId]);
    const [snapshot,setSnapshot]=React.useState(undefined as RetrySettingsSnapshot|undefined);
    const [notice,setNotice]=React.useState('');
    React.useEffect(()=>{let live=true;setSnapshot(undefined);source.load().then((v:RetrySettingsSnapshot)=>{if(live){setSnapshot(v);setNotice('');}},()=>{if(live)setNotice('unavailable');});return()=>{live=false;};},[source]);
    return h('section',{'aria-label':t('Native provider retry policy','原生提供方重试策略')},
      h('p',{role:'status'},t('Message-free recovery unavailable: this host has no terminal failed-request recovery capability.','无消息恢复不可用：此宿主没有终态失败请求恢复能力。')),
      !snapshot?h('p',{role:notice?'alert':'status'},notice?t('Native retry settings unavailable.','原生重试设置不可用。'):t('Loading native provider policy…','正在加载原生提供方策略…')):null,
      snapshot?.targets.length===0?h('p',{role:'status'},t('No supported native provider settings are available.','没有可用的受支持原生提供方设置。')):null,
      ...(snapshot?.targets??[]).map((target:RetrySettingsTarget)=>h(Provider,{key:target.id,target,writable:snapshot!.writable,source,onSaved:setSnapshot})));
  };
}
/** Generated combined/split composition contract. */
export function createRetrySettingsAdapter(React:any) {
  return {createView(ctx:any){return createRetrySettingsView(React,undefined,ctx.get('locale'));}};
}
