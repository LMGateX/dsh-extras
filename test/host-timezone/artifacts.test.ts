import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { HOST_TIMEZONE_TARGET_IDS, applyArtifactPatches, prepareArtifact } from '../../src/modules/host-timezone/artifacts.ts';

const consumer = createRequire(import.meta.url);
const runtime = createRequire(process.env.DSH_RUNTIME_ROOT
  ? join(process.env.DSH_RUNTIME_ROOT, 'package.json')
  : consumer.resolve('@deepseek-ai/dsh/package.json'));
const sessionId = '@deepseek-ai/dsh-api-session-controller';
const scheduleId = '@deepseek-ai/dsh-client-ui-schedule';
function native(id: string) {
  const manifestPath = runtime.resolve(id + '/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version: string };
  return { version: manifest.version, source: readFileSync(join(dirname(manifestPath), 'lib/client.js'), 'utf8') };
}

test('exact native session artifact samples the host zone without invoking browser Intl', () => {
  const original = native(sessionId);
  const prepared = prepareArtifact(sessionId, original.source, original.version, 'Asia/Singapore', 'epoch-a');
  const transformed = applyArtifactPatches(original.source, [prepared]);
  assert.notEqual(transformed, original.source);
  assert.equal(native(sessionId).source, original.source, 'preparation and application never write the native file');
  assert.equal(prepared.id, sessionId);
  assert.equal(prepared.patches.length, 2);
  const functionText = transformed.slice(transformed.indexOf('function resolvedClientTimeZone(){'), transformed.indexOf('function safeTime('));
  const zone = vm.runInNewContext(functionText + ';resolvedClientTimeZone()', { Intl: { DateTimeFormat() { throw new Error('browser zone must not be sampled'); } } });
  assert.equal(zone, 'Asia/Singapore');
  assert.equal(transformed.split('clientTimeZone:resolvedClientTimeZone()').length - 1, 1, 'subagent uses the same sampler');
  assert.ok(transformed.includes('const clientTimeZone=resolvedClientTimeZone()'), 'ordinary queue/steer/retry use the same sampler');
  new vm.Script(transformed);
});

test('native schedule defaults use host-local dates across midnight and DST without changing explicit rules', () => {
  const original = native(scheduleId);
  for (const example of [
    { zone: 'Asia/Singapore', now: '2026-11-16T16:30:33Z', start: '2026-11-17T01:30:00', day: 17, weekday: 2 },
    { zone: 'America/New_York', now: '2026-03-08T06:30:33Z', start: '2026-03-08T03:30:00', day: 8, weekday: 7 },
  ]) {
    const prepared = prepareArtifact(scheduleId, original.source, original.version, example.zone, 'epoch-a');
    const transformed = applyArtifactPatches(original.source, [prepared]);
    assert.equal(prepared.patches.length, 2);
    const functions = transformed.slice(transformed.indexOf('function startInZone('), transformed.indexOf('function rruleFromDraft('));
    class FixedDate extends Date {
      static override now() { return Date.parse(example.now); }
      override getTimezoneOffset(): number { throw new Error('browser-local offset must not be sampled'); }
    }
    const draft = vm.runInNewContext(functions + ';defaultTiming()', { Date: FixedDate, Intl: {
      DateTimeFormat: class {
        constructor(locale: string, options: Intl.DateTimeFormatOptions) {
          assert.equal(options.timeZone, example.zone, 'only an explicit host zone is formatted');
          return new Intl.DateTimeFormat(locale, options);
        }
      },
    } });
    assert.equal(draft.timeZone, example.zone);
    assert.equal(draft.start, example.start);
    assert.equal(draft.monthDay, example.day);
    assert.deepEqual(Array.from(draft.weekdays), [example.weekday]);
    assert.equal(draft.dailyTime, example.zone === 'Asia/Singapore' ? '01:30' : '03:30');
    const originalRules = original.source.slice(original.source.indexOf('function rruleFromDraft('));
    const withoutMarker = transformed.replace(prepared.patches[1]!.after, () => prepared.patches[1]!.before);
    assert.equal(withoutMarker.slice(withoutMarker.indexOf('function rruleFromDraft(')), originalRules, 'stored/user-selected timing conversion and remaining UI remain byte-for-byte native');
    new vm.Script(transformed);
  }
});

test('preparation rejects unknown IDs, versions, bytes and unavailable or non-IANA zones without leaking input', () => {
  const original = native(sessionId);
  assert.deepEqual(Array.from(HOST_TIMEZONE_TARGET_IDS), [sessionId, scheduleId]);
  for (const version of ['0.2.2-rc.2', '0.2.2', '0.2.2-rc.3-custom', '']) {
    assert.throws(() => prepareArtifact(sessionId, original.source, version, 'UTC', 'epoch-a'), /host-timezone: unsupported native version/);
  }
  assert.throws(() => prepareArtifact('other', original.source, original.version, 'UTC', 'epoch-a'), /unsupported native artifact/);
  assert.throws(() => prepareArtifact(sessionId, original.source + '\n', original.version, 'UTC', 'epoch-a'), /fingerprint mismatch/);
  assert.throws(() => prepareArtifact(scheduleId, original.source, original.version, 'UTC', 'epoch-a'), /fingerprint mismatch/);
  for (const invalid of ['', ' ', 'Mars/Olympus', '+08:00', 'Asia/Singapore\n', '";globalThis.leak=true;//']) {
    assert.throws(() => prepareArtifact(sessionId, original.source, original.version, invalid, 'epoch-a'), (error: unknown) => {
      assert.equal((error as Error).message, 'host-timezone: host time zone is unavailable');
      return true;
    });
  }
});

test('single-entry and combo transforms reject missing or repeated anchors and preserve unrelated bytes', () => {
  const session = native(sessionId);
  const schedule = native(scheduleId);
  const a = prepareArtifact(sessionId, session.source, session.version, 'Asia/Singapore', 'epoch-a');
  const b = prepareArtifact(scheduleId, schedule.source, schedule.version, 'Asia/Singapore', 'epoch-a');
  const source = '/* unrelated Ω */\n' + session.source + '\n' + schedule.source + '\n/* unchanged suffix */';
  const expected = '/* unrelated Ω */\n' + applyArtifactPatches(session.source, [a]) + '\n' + applyArtifactPatches(schedule.source, [b]) + '\n/* unchanged suffix */';
  assert.equal(applyArtifactPatches(source, [a, b]), expected);
  assert.equal(applyArtifactPatches(source, []), source);
  assert.throws(() => applyArtifactPatches(schedule.source, [a]), /exactly one artifact anchor/);
  assert.throws(() => applyArtifactPatches(session.source + session.source, [a]), /exactly one artifact anchor/);
  assert.throws(() => applyArtifactPatches(source, [a, a]), /exactly one artifact anchor/);
  assert.throws(() => applyArtifactPatches(source, [{ id: sessionId, patches: [{ before: '', after: 'bad' }] }]), /exactly one artifact anchor/);
  assert.deepEqual(Object.keys(a).sort(), ['id', 'patches']);
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.patches) && Object.isFrozen(a.patches[0]));
  assert.equal(JSON.stringify([a, b]).includes('Asia/Shanghai'), false, 'patch metadata never captures the actual browser-detected zone');
  assert.equal(JSON.stringify([a, b]).includes('fixedTimeZone'), false, 'internal host-derived parameter is not a configurable fixed-zone setting');
});

test('source provenance is readonly, non-enumerable and bound to the required epoch', () => {
  for (const id of [sessionId, scheduleId]) {
    const original = native(id);
    const prepared = prepareArtifact(id, original.source, original.version, 'UTC', 'epoch-a');
    const marker = prepared.patches[1]!;
    const exports: Record<string, unknown> = {};
    vm.runInNewContext(marker.after.slice(marker.after.indexOf('Object.defineProperty')).replace('return module.exports', ''), { exports, module: { exports } });
    const descriptor = Object.getOwnPropertyDescriptor(exports, '__dshExtrasHostTimezoneSource')!;
    assert.equal(descriptor.enumerable, false);
    assert.equal(descriptor.writable, false);
    assert.equal(descriptor.configurable, false);
    assert.deepEqual(JSON.parse(JSON.stringify(descriptor.value)), { protocol: 'dsh-extras.host-timezone.v1', epoch: 'epoch-a' });
    assert.equal(Object.isFrozen(descriptor.value), true);
    for (const bad of ['', 'x/y', 'x?bad', '\n']) assert.throws(() => prepareArtifact(id, original.source, original.version, 'UTC', bad), /source epoch/);
  }
});
