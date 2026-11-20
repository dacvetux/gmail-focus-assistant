import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { applyMigrations, openWorkerDatabase } from "./sqlite.mjs";

const databaseArg = process.argv[2];
if (!databaseArg || process.argv.length !== 3 || databaseArg === "--help") {
  process.stderr.write("Usage: npm run db:migrate -- <persistent-sqlite-path>\n");
  process.exitCode = databaseArg === "--help" ? 0 : 2;
} else {
  const databasePath = resolve(databaseArg);
  const migrationsDirectory = fileURLToPath(new URL("../migrations/", import.meta.url));
  let database;
  try {
    database = openWorkerDatabase(databasePath);
    const applied = await applyMigrations(database, migrationsDirectory);
    process.stdout.write(`Focuna DB schema is at migration ${applied.at(-1)?.version ?? 0}.\n`);
  } catch (error) {
    process.stderr.write(`Migration failed: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    database?.close();
  }
}
