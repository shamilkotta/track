// IST date math for the clients tab. IST is a fixed UTC+05:30 offset with no DST,
// so plain offset arithmetic is exact. Business days are mon-fri; holidays are
// ignored in v1.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function istWeekday(at: Date) {
  return new Date(at.getTime() + IST_OFFSET_MS).getUTCDay();
}

function isWeekendIst(at: Date) {
  const weekday = istWeekday(at);
  return weekday === 0 || weekday === 6;
}

export function addBusinessDaysIst(at: Date, days: number) {
  let cursor = at.getTime();
  let added = 0;
  while (added < days) {
    cursor += DAY_MS;
    if (!isWeekendIst(new Date(cursor))) added += 1;
  }
  return new Date(cursor);
}

export const FOLLOWUP_BUSINESS_DAYS = 5;

// Follow-up due for a first send at `sentAt`. A send that lands on an IST weekend is
// treated as sent on the following Monday (same time of day), so Sat/Sun sends get
// the same 5 working days as a Monday send.
export function followupDueAtIst(sentAt: Date) {
  let anchor = sentAt.getTime();
  while (isWeekendIst(new Date(anchor))) anchor += DAY_MS;
  return addBusinessDaysIst(new Date(anchor), FOLLOWUP_BUSINESS_DAYS);
}

// Midnight IST at the start of the IST calendar day containing `at`, shifted by `days`.
export function istDayStart(at: Date, days = 0) {
  const local = at.getTime() + IST_OFFSET_MS;
  const midnightLocal = Math.floor(local / DAY_MS) * DAY_MS;
  return new Date(midnightLocal - IST_OFFSET_MS + days * DAY_MS);
}

export function istDateLabel(at: Date) {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
