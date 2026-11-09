import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {loaderFixture,response} from '../integration/loader-harness.ts';
import * as recovery from '../../src/modules/retry/recovery.ts';
export const checkpoint={sessionId:'session-a',checkpointId:'checkpoint-1',revision:3,attemptId:'attempt-1',attemptSeq:8,terminalSeq:10,turn:2,step:3,selection:{provider:'offline',model:'offline'},disposition:'budget-exhausted'};
export async function fixture(t:any){
 const f=await loaderFixture(t,{name:'recovery-fixture',moduleIds:[],modulePlugins:{}},{migration:{auto:false}});await f.ready();
 let enabled=true;let calls=0;let state:any={protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'available',checkpoint};
 const receipts=new Map();const commands:any[]=[];
 const nativeLike={read(){return state;},async retry(command:any){commands.push(command);if(receipts.has(command.operationId))return receipts.get(command.operationId);calls++;const result=command.expectedRevision!==3?{status:'rejected',reason:'checkpoint-stale'}:{status:'accepted',checkpointId:command.checkpointId,operationId:command.operationId,executionId:'execution-1'};receipts.set(command.operationId,result);return result;}};
 const agent:any={id:'session-a',recovery:nativeLike};
 f.ctx.reflect.provide('agents',{get(id:string){return id==='session-a'?agent:undefined;}});
 recovery.mountRequestRecovery(f.ctx,'recovery-fixture',()=>enabled);await f.loader.await();
 async function request(method='GET',body?:unknown,headers:Record<string,string>={host:f.host,cookie:f.ownerCookie,'content-type':'application/json'},query='?sessionId=session-a'){
  const route=f.routes.get('/extras/recovery-fixture/request-recovery');assert.ok(route);
  const req=Readable.from(body===undefined?[]:[typeof body==='string'?body:JSON.stringify(body)]);Object.assign(req,{method,headers,url:'/extras/recovery-fixture/request-recovery'+query});const res=response();await route.handler(req,res);return {...res,json:res.body?JSON.parse(res.body):undefined};
 }
 return {...f,agent,nativeLike,commands,request,calls:()=>calls,setState:(s:any)=>{state=s;},setEnabled:(v:boolean)=>{enabled=v;}};
}

