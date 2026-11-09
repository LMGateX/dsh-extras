import test from 'node:test';
import assert from 'node:assert/strict';
import {Context} from '@deepseek-ai/cordis';
import {createExtrasClient} from '../../client/composition.ts';

test('selected recovery adapter follows accepted native enablement and runtime admission and closes on disposal',async t=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({modules:{retry:{phase:'active',ready:true,enabled:true}}})}) as any;t.after(()=>{globalThis.fetch=previous;});
 const ctx=new Context();t.after(()=>ctx.fiber.dispose());
 let snapshot:any={status:'ready',writable:true,revision:1,value:{modules:{retry:{enabled:true}}}};const listeners=new Set<()=>void>();
 const form={getSnapshot:()=>snapshot,subscribe(fn:()=>void){listeners.add(fn);return()=>listeners.delete(fn);},async mutate(){throw new Error('composition must never write configuration');}};
 ctx.reflect.provide('configForms',{get:()=>form,whileServed(_rows:any,fn:()=>()=>void){return fn();}});
 ctx.reflect.provide('slots',{inject(_name:any,fn:()=>()=>void){return fn();},register(){return()=>{};}});
 let options:any;let disposed=0;const observed:boolean[]=[];let ready!:()=>void;const admitted=new Promise<void>(resolve=>{ready=resolve;});
 const factory=()=>({mount(_ctx:any,next:any){options=next;const sync=()=>{const value=options.enabled();observed.push(value);if(value)ready();};const off=options.subscribe(sync);sync();return()=>{disposed++;off();};}});
 const plugin=(createExtrasClient as any)({rowId:'dsh-extras-retry',packageName:'dsh-extras-retry',moduleIds:['retry']},{createElement(){}},undefined,undefined,undefined,undefined,factory);
 const fiber=ctx.plugin(plugin);await fiber;assert.ok(options,'selected recovery factory is mounted');await admitted;assert.equal(options.rowId,'dsh-extras-retry');assert.equal(options.enabled(),true);
 snapshot={...snapshot,revision:2,value:{modules:{retry:{enabled:false}}}};for(const fn of listeners)fn();assert.equal(options.enabled(),false);
 snapshot={...snapshot,revision:3,status:'unavailable',value:{modules:{retry:{enabled:true}}}};for(const fn of listeners)fn();assert.equal(options.enabled(),false);
 snapshot={...snapshot,status:'ready'};for(const fn of listeners)fn();assert.equal(options.enabled(),true);
 await fiber.dispose();assert.equal(disposed,1);assert.equal(options.enabled(),false,'a retained callback cannot admit after native disposal');assert.equal(listeners.size,0);assert.ok(observed.includes(false)&&observed.includes(true));
});

test('an unrelated split never constructs or mounts recovery',async t=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({modules:{}})}) as any;t.after(()=>{globalThis.fetch=previous;});
 const ctx=new Context();t.after(()=>ctx.fiber.dispose());const form={getSnapshot:()=>({status:'ready',writable:true,revision:1,value:{}}),subscribe:()=>()=>{},mutate:async()=>false};
 ctx.reflect.provide('configForms',{get:()=>form,whileServed(_rows:any,fn:()=>()=>void){return fn();}});ctx.reflect.provide('slots',{inject(_name:any,fn:()=>()=>void){return fn();},register(){return()=>{};}});
 let constructions=0;const plugin=(createExtrasClient as any)({rowId:'dsh-extras-compact-context',packageName:'dsh-extras-compact-context',moduleIds:['compact-context']},{createElement(){}},undefined,undefined,undefined,undefined,()=>{constructions++;return{mount(){throw new Error('unselected recovery');}};});
 await ctx.plugin(plugin);assert.equal(constructions,0);
});
