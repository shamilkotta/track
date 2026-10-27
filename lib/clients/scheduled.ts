import { retryUndelivered, runColdSweep } from "@/lib/clients/store";

// Cron triggers (wrangler.jsonc):
//   "*/15 * * * *" retries undelivered webhook events
//   "30 3 * * *"   09:00 IST daily cold sweep
export const COLD_SWEEP_CRON = "30 3 * * *";

export async function scheduled(controller: { cron: string; scheduledTime: number }) {
  const now = new Date(controller.scheduledTime || Date.now());
  if (controller.cron === COLD_SWEEP_CRON) {
    const cold = await runColdSweep(now);
    console.log(`[clients] cold sweep moved ${cold.moved}`);
  }
  const retry = await retryUndelivered();
  console.log(`[clients] webhook retry tried ${retry.tried}, delivered ${retry.delivered}`);
}
