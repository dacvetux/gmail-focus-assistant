import { createAssessmentJobHandlers } from "./assessment-job-handlers.mjs";
import { runAssessmentMaintenanceOnce, startAssessmentMaintenance } from "./assessment-maintenance.mjs";
import { createWorkerHttpServer } from "./http-server.mjs";
import { SqliteAssessmentJobRepository } from "./sqlite-assessment-jobs.mjs";
import { SqliteApprovalAuditRepository } from "./sqlite-approval-audit.mjs";
import { SqliteConfigRevisionRepository } from "./sqlite-config-revisions.mjs";
import { SqliteNonceStore } from "./sqlite-nonce-store.mjs";
import { SqliteProviderBudget } from "./sqlite-provider-budget.mjs";
import { SqliteFixedWindowRateLimiter } from "./sqlite-rate-limiter.mjs";
import { createAssessmentSubmissionValidator } from "./validate-assessment-submission.mjs";

const REQUIRED_MIGRATION_VERSION = 6;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);

/** Compose the offline worker; construction is inert and never listens/calls JEV. */
export function createWorkerRuntime({
  database,
  keyRegistry,
  responseKeyId,
  configRepository = database && new SqliteConfigRevisionRepository(database),
  questionSetRepository,
  provider = "typesafe-systemone",
  model = "jev-1.14.0",
  rateLimit,
  rateWindowSeconds,
  clock = () => new Date(),
}) {
  if (!database || !keyRegistry || !configRepository || !questionSetRepository || !responseKeyId) {
    throw new TypeError("Worker runtime dependencies are required");
  }
  const migration = database.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
  if (migration?.version !== REQUIRED_MIGRATION_VERSION) throw new Error("Worker database migrations are incomplete");
  const responseKey = keyRegistry.get(responseKeyId);
  if (!responseKey || responseKey.revokedAt) throw new Error("Response signing key is unavailable");
  if (!Number.isSafeInteger(rateLimit) || !Number.isSafeInteger(rateWindowSeconds)) {
    throw new TypeError("Explicit API rate-limit policy is required");
  }

  const jobs = new SqliteAssessmentJobRepository(database);
  const nonces = new SqliteNonceStore(database);
  const budget = new SqliteProviderBudget(database);
  const audit = new SqliteApprovalAuditRepository(database);
  const validator = createAssessmentSubmissionValidator({
    configRepository, questionSetRepository, provider, model, clock,
  });
  const routes = createAssessmentJobHandlers({ repository: jobs, validateSubmission: validator, clock });
  const server = createWorkerHttpServer({
    keyRegistry,
    nonceStore: nonces,
    responseKey,
    handlers: routes,
    rateLimiter: new SqliteFixedWindowRateLimiter(database, { limit: rateLimit, windowSeconds: rateWindowSeconds }),
  });

  return {
    server,
    repositories: { jobs, config: configRepository, audit, budget },
    runMaintenance: () => runAssessmentMaintenanceOnce(jobs, clock),
    /** Only bind loopback; public TLS must terminate at the separately managed proxy. */
    async listen({ host = "127.0.0.1", port }) {
      if (!LOOPBACK_HOSTS.has(host) || !Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new TypeError("Worker may listen only on an explicit loopback host and valid port");
      }
      runAssessmentMaintenanceOnce(jobs, clock);
      const maintenance = startAssessmentMaintenance({ repository: jobs, clock });
      try {
        await new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(port, host, resolve);
        });
      } catch (error) {
        maintenance.stop();
        throw error;
      }
      return {
        address: server.address(),
        async close() {
          maintenance.stop();
          await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        },
      };
    },
  };
}
