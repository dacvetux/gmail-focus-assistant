import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const domain = require("../../../dist/domain/src/index.js");
const Ajv2020 = require("ajv/dist/2020.js").default;
const validateQuestionSet = new Ajv2020({ allErrors: true, strict: true }).compile(domain.choiceQuestionSetSchema);

/** Immutable versioned registry for worker-approved question sets. */
export class SqliteQuestionSetRepository {
  constructor(database, clock = () => new Date().toISOString()) {
    this.database = database;
    this.clock = clock;
    this.lookup = database.prepare("SELECT digest, record_json FROM question_sets WHERE version = ? AND task = ?");
    this.insert = database.prepare(`
      INSERT INTO question_sets (version, task, digest, record_json, registered_at)
      VALUES (?, ?, ?, ?, ?)
    `);
  }

  get(version, task) {
    const row = this.lookup.get(version, task);
    if (!row) return undefined;
    const questionSet = JSON.parse(row.record_json);
    validate(questionSet);
    if (digest(questionSet) !== row.digest) throw new Error("Stored question-set integrity check failed");
    return questionSet;
  }

  /** Internal provisioning path only; there is deliberately no HTTP mutation route. */
  register(questionSet) {
    validate(questionSet);
    const serialized = domain.canonicalJson(questionSet);
    const contentDigest = digest(questionSet);
    const register = this.database.transaction(() => {
      const existing = this.lookup.get(questionSet.version, questionSet.task);
      if (existing) {
        if (existing.digest !== contentDigest || existing.record_json !== serialized) {
          throw new Error("Question-set version already exists with different content");
        }
        return { registered: false, questionSet: JSON.parse(existing.record_json) };
      }
      this.insert.run(questionSet.version, questionSet.task, contentDigest, serialized, this.clock());
      return { registered: true, questionSet };
    });
    return register.immediate();
  }
}

function validate(questionSet) {
  if (!validateQuestionSet(questionSet)) {
    const error = new Error("Question set is invalid");
    error.code = "INVALID_RECORD";
    throw error;
  }
}

function digest(value) {
  return createHash("sha256").update(domain.canonicalJson(value), "utf8").digest("hex");
}
