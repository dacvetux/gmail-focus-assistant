import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const domain = require("../../../dist/domain/src/index.js");
const ajv = require("ajv/dist/2020.js");
const validateConfig = new ajv.default({ allErrors: true, strict: true }).compile(domain.configRevisionSchema);

/** Immutable, single-head config revision storage for the worker SQLite DB. */
export class SqliteConfigRevisionRepository {
  constructor(database) {
    this.database = database;
    this.byRevision = database.prepare("SELECT record_json FROM config_revisions WHERE revision = ?");
    this.heads = database.prepare(`
      SELECT r.record_json FROM config_revisions AS r
      LEFT JOIN config_revisions AS child ON child.parent_revision = r.revision
      WHERE child.revision IS NULL ORDER BY r.published_at DESC
    `);
    this.insert = database.prepare(`
      INSERT INTO config_revisions (revision, parent_revision, digest, published_at, published_by, record_json)
      VALUES (@revision, @parentRevision, @digest, @publishedAt, @publishedBy, @recordJson)
    `);
  }

  getRevision(revision) {
    const row = this.byRevision.get(revision);
    return row ? parseRevision(row.record_json) : undefined;
  }

  getCurrentRevision() {
    const rows = this.heads.all();
    if (rows.length > 1) throw new Error("Config revision store contains competing heads");
    return rows.length === 1 ? parseRevision(rows[0].record_json) : null;
  }

  preview(candidate) {
    validateCandidate(candidate);
    return domain.previewConfigRevision(this.getCurrentRevision(), candidate, sha256Hex);
  }

  /** Compare-and-publish in one immediate transaction; branches fail as stale. */
  publish(candidate) {
    validateCandidate(candidate);
    const publish = this.database.transaction(() => {
      const current = this.getCurrentRevision();
      const preview = domain.previewConfigRevision(current, candidate, sha256Hex);
      if (preview.status === "duplicate") return { published: false, preview, revision: current };
      this.insert.run({
        revision: candidate.revision,
        parentRevision: candidate.parentRevision,
        digest: candidate.digest,
        publishedAt: candidate.publishedAt,
        publishedBy: candidate.publishedBy,
        recordJson: JSON.stringify(candidate),
      });
      return { published: true, preview, revision: candidate };
    });
    return publish.immediate();
  }
}

function validateCandidate(candidate) {
  if (!validateConfig(candidate)) {
    const error = new Error("Config revision is invalid");
    error.code = "INVALID_RECORD";
    throw error;
  }
  domain.assertConfigRevisionDigest(candidate, sha256Hex);
  domain.assertRuleSetValid(candidate.rules);
}

function parseRevision(json) {
  const revision = JSON.parse(json);
  validateCandidate(revision);
  return revision;
}

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
