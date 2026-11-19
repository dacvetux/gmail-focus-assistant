import Database from "better-sqlite3";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** Open the one-worker SQLite database with conservative durability settings. */
export function openWorkerDatabase(databasePath) {
  if (!databasePath || databasePath === ":memory:") throw new Error("A persistent worker database path is required");
  const database = new Database(databasePath, { timeout: 5000 });
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = FULL");
  database.pragma("busy_timeout = 5000");
  return database;
}

/** Apply immutable numbered migrations atomically; never drops or resets data. */
export async function applyMigrations(database, migrationsDirectory) {
  const files = (await readdir(migrationsDirectory))
    .filter(name => /^\d{3}_[a-z0-9_-]+\.sql$/.test(name))
    .sort();
  for (const file of files) {
    const version = Number(file.slice(0, 3));
    const hasLedger = Boolean(database.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
    ).get());
    const applied = hasLedger && Boolean(database.prepare("SELECT 1 AS present FROM schema_migrations WHERE version = ?").get(version));
    if (applied) continue;

    const sql = await readFile(join(migrationsDirectory, file), "utf8");
    const migrate = database.transaction(() => {
      database.exec(sql);
      database.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
        .run(version, new Date().toISOString());
    });
    migrate.immediate();
  }
  return database.prepare("SELECT version, applied_at FROM schema_migrations ORDER BY version").all();
}
