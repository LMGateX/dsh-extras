import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import {createRequire} from 'node:module';
import {createExtrasClient} from '../../client/composition.ts';

test('selected timezone adapter reads only accepted enablement, preserving unknown and disposal boundaries',async t=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>{throw new Error('unavailable root status must not decide page validity');};
  t.after(()=>{globalThis.fetch=previous;});
  const ctx=new Context();t.after(()=>ctx.fiber.dispose());
  let snapshot:any={status:'ready',writable:true,revision:1,value:{modules:{'host-timezone':{enabled:true}}}};
  const listeners=new Set<()=>void>();
  const form={
    getSnapshot(){assert.equal(this,form);return snapshot;},
    subscribe(fn:()=>void){assert.equal(this,form);listeners.add(fn);return()=>listeners.delete(fn);},
    async mutate(){throw new Error('composition must not write accepted configuration');},
  };
  ctx.reflect.provide('configForms',{get:()=>form,whileServed(_rows:any,fn:()=>()=>void){return fn();}});
  ctx.reflect.provide('slots',{inject(_name:any,fn:()=>()=>void){return fn();},register(){return()=>{};}});
  let options:any;let mountedCtx:any;let viewCtx:any;let disposed=0;
  const observed:(boolean|undefined)[]=[];
  const factory=()=>({
    mount(scope:any,next:any){mountedCtx=scope;options=next;const sync=()=>observed.push(next.enabled());const off=next.subscribe(sync);sync();return()=>{disposed++;off();};},
    createView(scope:any){viewCtx=scope;return ()=>null;},
  });
  const plugin=(createExtrasClient as any)({rowId:'dsh-extras-host-timezone',packageName:'dsh-extras-host-timezone',moduleIds:['host-timezone']},{createElement(){}},undefined,undefined,undefined,undefined,undefined,factory);
  const fiber=ctx.plugin(plugin);await fiber;
  assert.ok(options,'selected timezone factory is mounted');
  assert.equal(options.rowId,'dsh-extras-host-timezone');
  assert.equal(viewCtx,mountedCtx,'page view shares the owned adapter scope');
  assert.equal(options.enabled(),true,'missing server status cannot revoke accepted enablement');
  const notify=()=>{for(const fn of listeners)fn();};
  for(const next of [
    {...snapshot,status:'loading'},
    {...snapshot,status:'unavailable'},
    {...snapshot,value:undefined},
    {...snapshot,value:{modules:{}}},
    {...snapshot,value:{modules:{'host-timezone':{enabled:'yes'}}}},
  ]) {snapshot=next;notify();assert.equal(options.enabled(),undefined,'unknown never becomes an explicit disable');}
  snapshot={status:'ready',writable:false,revision:2,value:{modules:{'host-timezone':{enabled:false}}}};
  notify();assert.equal(options.enabled(),false,'accepted disabled intent remains observable even read-only');
  snapshot={...snapshot,value:{modules:{'host-timezone':{enabled:true}}}};
  notify();assert.equal(options.enabled(),true);
  assert.ok(observed.includes(true)&&observed.includes(false)&&observed.includes(undefined));
  await fiber.dispose();assert.equal(disposed,1);assert.equal(options.enabled(),undefined);
  assert.equal(listeners.size,0,'owned adapter disposal closes accepted-store subscriptions');
});

test('old split descriptors never construct the timezone guard or page view',async t=>{
  const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({modules:{}})}) as any;
  t.after(()=>{globalThis.fetch=previous;});
  for(const id of ['compact-context','model-policy','retry','chime','goalWait']) {
    const ctx=new Context();
    const form={getSnapshot:()=>({status:'ready',writable:true,revision:1,value:{modules:{}}}),subscribe:()=>()=>{},mutate:async()=>false};
    ctx.reflect.provide('configForms',{get:()=>form,whileServed(_rows:any,fn:()=>()=>void){return fn();}});
    ctx.reflect.provide('slots',{inject(_name:any,fn:()=>()=>void){return fn();},register(){return()=>{};}});
    let constructions=0;
    const factory=()=>{constructions++;throw new Error('unselected timezone factory must never run');};
    try {
      const plugin=(createExtrasClient as any)({rowId:'split-'+id,packageName:'split-'+id,moduleIds:[id]},{createElement(){}},undefined,undefined,undefined,undefined,undefined,factory);
      await ctx.plugin(plugin);assert.equal(constructions,0,id);
    } finally {await ctx.fiber.dispose();}
  }
});

test('source facade selects the real readonly timezone page-status adapter in Chinese and English',async t=>{
  const require=createRequire(import.meta.url);
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
  const {createExtrasClient:sourceClient}=await import('../../client/index.ts');
  const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({modules:{'host-timezone':{phase:'disabled',ready:true,enabled:false}}})}) as any;
  t.after(()=>{globalThis.fetch=previous;});
  for(const language of [undefined,'en']) {
    const ctx=new Context();t.after(()=>ctx.fiber.dispose());
    if(language)ctx.reflect.provide('locale',{getLocale:()=>({active:language}),subscribe:()=>()=>{},resolveText:(text:any)=>text[language]});
    const snapshot={status:'ready',writable:true,revision:1,value:{modules:{'host-timezone':{enabled:false}}}};
    const form={getSnapshot:()=>snapshot,subscribe:()=>()=>{},mutate:async()=>{throw new Error('readonly view never writes');}};
    ctx.reflect.provide('configForms',{get:()=>form,whileServed(_rows:any,fn:()=>()=>void){return fn();}});
    let View:any;
    ctx.reflect.provide('slots',{inject(_name:any,fn:()=>()=>void){return fn();},register(_entry:any,component:any){View=component;return()=>{};}});
    const fiber=ctx.plugin(sourceClient({rowId:'source-timezone',packageName:'source-timezone',moduleIds:['host-timezone']},React));
    await fiber;assert.ok(View,'source facade registers unified settings');
    const html=renderToStaticMarkup(React.createElement(View,{configForm:form}));
    assert.ok(html.includes('data-host-timezone-page-status'),'the actual selected guard view is mounted, not a generic unavailable fallback');
    const pageStatus=html.split('data-host-timezone-page-status')[1]!.split('</div>')[0]!;
    if(language==='en') {
      assert.match(pageStatus,/Current page/);
      assert.doesNotMatch(pageStatus,/[一-鿿]/);
    } else {
      assert.match(pageStatus,/[一-鿿]/,'actual page status follows the Chinese fallback locale');
      assert.doesNotMatch(pageStatus,/Current page:/);
    }
    assert.equal((html.match(/type="checkbox"/g)??[]).length,1);
    await fiber.dispose();
  }
});
