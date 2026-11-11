import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestRecoverySource} from '../../client/request-recovery.ts';

test('incompatible optional protocol diagnosis survives the host-to-browser boundary', async()=>{
 const source=createRequestRecoverySource('retry',async()=>new Response(JSON.stringify({protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'unavailable',reason:'native-recovery-incompatible'})) as any);
 assert.equal((await source.read('session')).reason,'native-recovery-incompatible');
});
