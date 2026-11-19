const DAY_MS = 24 * 60 * 60 * 1000;
const METADATA_RETENTION_MS = 30 * DAY_MS;

/** Run one retention pass; call once at startup and on a bounded interval. */
export function runAssessmentMaintenanceOnce(repository, clock = () => new Date()) {
  if (!repository) throw new TypeError("Assessment repository is required");
  const instant = clock();
  const now = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(now.getTime())) throw new TypeError("Maintenance clock returned an invalid time");
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - METADATA_RETENTION_MS).toISOString();
  const expiredJobs = repository.expireOverdueJobs(nowIso);
  const expiredPayloads = repository.expirePayloads(nowIso);
  const prunedJobs = repository.pruneContentFreeMetadata(cutoffIso);
  return { expiredJobs, expiredPayloads, prunedJobs };
}

/** Start a non-overlapping maintenance loop; caller owns process lifecycle. */
export function startAssessmentMaintenance({ repository, intervalMs = 60_000, clock, onError = () => {} }) {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1_000 || intervalMs > 24 * 60 * 60 * 1000) {
    throw new TypeError("Maintenance interval must be between one second and one day");
  }
  if (typeof onError !== "function") throw new TypeError("onError must be a function");
  let running = false;
  let stopped = false;
  const timer = setInterval(() => {
    if (running || stopped) return;
    running = true;
    try {
      runAssessmentMaintenanceOnce(repository, clock);
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return {
    runOnce: () => runAssessmentMaintenanceOnce(repository, clock),
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
