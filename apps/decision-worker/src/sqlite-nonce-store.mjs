/** SQLite-backed, transactionally unique nonce reservation for one worker. */
export class SqliteNonceStore {
  constructor(database, clock = () => Math.floor(Date.now() / 1000)) {
    this.database = database;
    this.clock = clock;
    this.insert = database.prepare(
      "INSERT INTO api_auth_nonces (key_id, nonce, expires_at, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(key_id, nonce) DO NOTHING",
    );
    this.deleteExpired = database.prepare("DELETE FROM api_auth_nonces WHERE expires_at <= ?");
  }

  /**
   * Atomically expire stale entries and reserve one key/nonce pair. Requires a
   * dedicated SQLite connection and the migration 002 table/index.
   */
  reserve(keyId, nonce, expiresAt) {
    const now = this.clock();
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;

    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.deleteExpired.run(now);
      const result = this.insert.run(keyId, nonce, expiresAt, now);
      this.database.exec("COMMIT");
      return Number(result.changes) === 1;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}
