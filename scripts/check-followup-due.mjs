// Re-runnable check for the follow-up and cold due rules: `pnpm check:followup-due`.
// Node >= 23.6 strips the types from time.ts on import.
import assert from "node:assert/strict";
import { coldDueAtIst, followupDueAtIst } from "../lib/clients/time.ts";

const ist = (local) => new Date(`${local}+05:30`);
const label = (date) => new Date(date.getTime() + 5.5 * 3600e3).toISOString().slice(0, 16);

const cases = [
  ["Sat send rolls to Mon, +5", "2026-10-24T10:00:00", "2026-11-02T10:00"],
  ["Sun send rolls to Mon, +5", "2026-10-25T21:30:00", "2026-11-02T21:30"],
  ["Mon send, +5", "2026-10-26T09:00:00", "2026-11-02T09:00"],
  ["Fri send, +5 skips the weekend", "2026-10-23T18:00:00", "2026-10-30T18:00"],
  ["Fri 23:59 IST is still Fri (UTC is Fri too)", "2026-10-23T23:59:00", "2026-10-30T23:59"],
  ["Sat 00:30 IST is Sat even though UTC is Fri", "2026-10-24T00:30:00", "2026-11-02T00:30"],
];
const coldCases = [
  ["Sat follow-up rolls to Mon, +5", "2026-10-31T11:00:00", "2026-11-09T11:00"],
  ["Sun follow-up rolls to Mon, +5", "2026-11-01T08:15:00", "2026-11-09T08:15"],
  ["Mon follow-up, +5", "2026-11-02T10:53:00", "2026-11-09T10:53"],
  ["Fri follow-up, +5 skips the weekend", "2026-10-30T17:26:00", "2026-11-06T17:26"],
  [
    "Sat 00:30 IST follow-up is Sat even though UTC is Fri",
    "2026-10-31T00:30:00",
    "2026-11-09T00:30",
  ],
];
for (const [kind, fn, list] of [
  ["follow-up due", followupDueAtIst, cases],
  ["cold due", coldDueAtIst, coldCases],
]) {
  for (const [name, sent, want] of list) {
    const got = label(fn(ist(sent)));
    assert.equal(got, want, `${kind}, ${name}: ${sent} -> ${got}, want ${want}`);
    console.log(`ok  ${kind}, ${name}: ${sent} IST -> ${got} IST`);
  }
}
