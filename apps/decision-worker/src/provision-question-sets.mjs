import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { openWorkerDatabase } from "./sqlite.mjs";
import { SqliteQuestionSetRepository } from "./sqlite-question-sets.mjs";

const args = process.argv.slice(2);
if (args.length !== 2 || args.includes("--help")) {
  process.stderr.write("Usage: npm run db:provision-question-sets -- <persistent-sqlite-path> <question-sets.json>\n");
  process.exitCode = args.includes("--help") ? 0 : 2;
} else {
  const [databasePathArg, inputPathArg] = args;
  const databasePath = resolve(databasePathArg);
  const inputPath = resolve(inputPathArg);
  let database;
  try {
    const source = await readFile(inputPath, "utf8");
    const records = JSON.parse(source);
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("Question-set input must be a non-empty JSON array");
    }
    database = openWorkerDatabase(databasePath);
    const version = database.pragma("user_version", { simple: true });
    if (version !== 7) throw new Error(`Database schema version must be 7 (found ${version}); run db:migrate first`);
    const repository = new SqliteQuestionSetRepository(database);
    const results = records.map(record => repository.register(record));
    const inserted = results.filter(result => result.registered).length;
    process.stdout.write(`Question sets processed: ${results.length}; newly registered: ${inserted}; unchanged: ${results.length - inserted}.\n`);
  } catch (error) {
    process.stderr.write(`Question-set provisioning failed: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    database?.close();
  }
}
