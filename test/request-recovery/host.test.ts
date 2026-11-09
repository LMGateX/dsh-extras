import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,checkpoint} from './fixture.ts';

test('HTTP adapts optional public native recovery capability and retains idempotent command keys',async t=>{
 const f=await fixture(t);const read=await f.request();assert.equal(read.code,200);assert.equal(read.json.status,'available');assert.deepEqual(read.json.checkpoint,checkpoint);
 const command={sessionId:'session-a',checkpointId:'checkpoint-1',expectedRevision:3,operationId:'operation-1'};
 assert.equal((await f.request('POST',command)).json.status,'accepted');assert.equal((await f.request('POST',command)).json.executionId,'execution-1');assert.equal(f.calls(),1);assert.deepEqual(f.commands[0],command);
});

test('disabled state wins over an in-flight capability read',async t=>{
 const f=await fixture(t);let release!:(v:unknown)=>void;let entered!:()=>void;const ready=new Promise<void>(r=>entered=r);
 f.nativeLike.read=()=>{entered();return new Promise(r=>release=r);};
 const pending=f.request();await ready;f.setEnabled(false);release({protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'available',checkpoint});
 assert.equal((await pending).json.status,'unavailable');
 assert.equal(f.calls(),0);
});

test('stock, incompatible, stale, disabled and unauthorized requests never manufacture recovery',async t=>{
 const f=await fixture(t);const command={sessionId:'session-a',checkpointId:'checkpoint-1',expectedRevision:2,operationId:'stale-1'};
 assert.equal((await f.request('POST',command)).json.reason,'checkpoint-stale');
 delete f.agent.recovery;assert.equal((await f.request()).json.reason,'native-recovery-unavailable');assert.equal((await f.request('POST',command)).code,409);
 f.agent.recovery=f.nativeLike;f.setState({protocol:'other',lifetime:'process-local',status:'available',checkpoint});assert.equal((await f.request()).json.status,'unavailable');
 f.setState({protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'unavailable',reason:'token-123456'});assert.equal((await f.request()).json.reason,'native-recovery-unavailable');
 f.setEnabled(false);assert.equal((await f.request('POST',command)).json.reason,'module-disabled');f.setEnabled(true);
 assert.equal((await f.request('GET',undefined,{host:f.host})).code,401);
 assert.equal((await f.request('GET',undefined,{host:'evil.invalid',cookie:f.ownerCookie})).code,403);
 assert.equal((await f.request('POST',command,{host:f.host,cookie:f.ownerCookie,origin:'https://evil.invalid'})).code,403);
 assert.equal((await f.request('POST',{...command,provider:'browser-forged'})).code,400);
 assert.equal((await f.request('POST','x'.repeat(8193))).code,413);
 assert.equal((await f.request('POST',command,{host:f.host,cookie:f.ownerCookie,'content-type':'text/plain'})).code,415);
 assert.equal((await f.request('GET',undefined,undefined,'?sessionId=session-a&sessionId=other')).code,400);
});
