/** Exact alpha.2 served-artifact adapter. Native files and global browser APIs stay untouched. */
import { createHash } from 'node:crypto';

export const HOST_TIMEZONE_TARGET_IDS = [
  '@deepseek-ai/dsh-api-session-controller',
  '@deepseek-ai/dsh-client-ui-schedule',
] as const;

export interface ArtifactPatch {
  readonly before: string;
  readonly after: string;
}

export interface PreparedArtifact {
  readonly id: string;
  readonly patches: readonly ArtifactPatch[];
}

const SESSION_SAMPLER = 'function resolvedClientTimeZone(){const timeZone=new Intl.DateTimeFormat().resolvedOptions().timeZone;if(typeof timeZone!==`string`||timeZone.length===0)throw new Error(`browser time zone is unavailable`);return timeZone}';

const SCHEDULE_DEFAULT = "function defaultTiming(){const date=new Date(Date.now()+60*6e4);const start=`${new Date(date.getTime()-date.getTimezoneOffset()*6e4).toISOString().slice(0,16)}:00`;const day=Number(start.slice(8,10));const weekday=(new Date(`${start.slice(0,10)}T00:00:00Z`).getUTCDay()+6)%7+1;return{frequency:`once`,interval:`1`,start,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,rrule:``,weekdays:[weekday],monthDay:day,dailyTime:start.slice(11,16)}}";

function requireSingleAnchor(body: string, anchor: string): void {
  if (!anchor || body.split(anchor).length !== 2) {
    throw new Error('host-timezone: expected exactly one artifact anchor');
  }
}

function requireHostTimeZone(timeZone: string): void {
  try {
    if (typeof timeZone !== 'string' || timeZone.length > 128
      || !/^[A-Za-z][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)*$/u.test(timeZone)) throw new Error();
    // Explicit input validation only: never sample this runtime's default zone.
    new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions();
  } catch {
    throw new Error('host-timezone: host time zone is unavailable');
  }
}

/** Prepare only an audited native artifact using a host-derived zone, never a user fixed-zone setting. */
export function prepareArtifact(id: string, source: string, version: string, timeZone: string, sourceEpoch: string): PreparedArtifact {
  if (version !== '0.2.3-alpha.2') throw new Error('host-timezone: unsupported native version');
  const isSession = id === HOST_TIMEZONE_TARGET_IDS[0];
  if (!isSession && id !== HOST_TIMEZONE_TARGET_IDS[1]) throw new Error('host-timezone: unsupported native artifact');
  const fingerprint = isSession
    ? '5e999335e66010345637bb533b8e1c67a3602e56f0cbb3bcfbc0d764e80248f2'
    : 'adf0906b9c61521766b942cdbaa678bb58d32540177bf19a9a9d1c5214b2fd5f';
  if (createHash('sha256').update(source, 'utf8').digest('hex') !== fingerprint) {
    throw new Error('host-timezone: native artifact fingerprint mismatch');
  }
  const before = isSession ? SESSION_SAMPLER : SCHEDULE_DEFAULT;
  requireSingleAnchor(source, before);
  requireHostTimeZone(timeZone);
  const zone = JSON.stringify(timeZone);
  const after = isSession
    ? 'function resolvedClientTimeZone(){return ' + zone + '}'
    : 'function defaultTiming(){const timeZone=' + zone + ';const start=startInZone(timeZone,Date.now()+3600000).slice(0,16)+":00";const day=Number(start.slice(8,10));const weekday=(new Date(`${start.slice(0,10)}T00:00:00Z`).getUTCDay()+6)%7+1;return{frequency:`once`,interval:`1`,start,timeZone,rrule:``,weekdays:[weekday],monthDay:day,dailyTime:start.slice(11,16)}}';
  if (typeof sourceEpoch !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/u.test(sourceEpoch)) throw new Error('host-timezone: source epoch is unavailable');
  const markerBefore = isSession
    ? 'exports.createSessionControlStream=createSessionControlStream;exports.inject=inject;exports.scopeOf=scopeOf;return module.exports'
    : 'SessionScheduleHover))})}exports.apply=apply;exports.inject=inject;return module.exports';
  requireSingleAnchor(source, markerBefore);
  const markerValue = JSON.stringify({ protocol: 'dsh-extras.host-timezone.v1', epoch: sourceEpoch });
  const markerAfter = markerBefore.replace('return module.exports', 'Object.defineProperty(exports,"__dshExtrasHostTimezoneSource",{value:Object.freeze(' + markerValue + ')});return module.exports');
  return Object.freeze({ id, patches: Object.freeze([Object.freeze({ before, after }), Object.freeze({ before: markerBefore, after: markerAfter })]) });
}

/** Apply exact anchors to a native single-entry or combo body; absent/duplicate anchors fail closed. */
export function applyArtifactPatches(body: string, prepareds: readonly PreparedArtifact[]): string {
  for (const prepared of prepareds) {
    for (const patch of prepared.patches) requireSingleAnchor(body, patch.before);
  }
  let result = body;
  for (const prepared of prepareds) {
    for (const patch of prepared.patches) {
      requireSingleAnchor(result, patch.before);
      result = result.replace(patch.before, () => patch.after);
    }
  }
  return result;
}
