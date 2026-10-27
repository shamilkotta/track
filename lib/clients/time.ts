// IST date math for the clients tab. IST is a fixed UTC+05:30 offset with no DST,
// so plain offset arithmetic is exact. Business days are mon-fri; holidays are
// ignored in v1.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function istWeekday(at: Date) {
  return new Date(at.getTime() + IST_OFFSET_MS).getUTCDay();
}

export function addBusinessDaysIst(at: Date, days: number) {
  let cursor = at.getTime();
  let added = 0;
  while (added < days) {
    cursor += DAY_MS;
    const weekday = istWeekday(new Date(cursor));
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return new Date(cursor);
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
