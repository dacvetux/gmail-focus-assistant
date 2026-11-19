/** Durable fixed-window request limiter; the host supplies the approved policy. */
export class SqliteFixedWindowRateLimiter {
  constructor(database, { limit, windowSeconds, clock = () => Date.now() }) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError("A positive requests-per-window limit is required");
    if (!Number.isSafeInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86_400) {
      throw new TypeError("Rate-limit window must be 1 to 86400 seconds");
    }
    if (typeof clock !== "function") throw new TypeError("A clock function is required");
    this.database = database;
    this.limit = limit;
    this.windowSeconds = windowSeconds;
    this.clock = clock;
    this.increment = database.prepare(`
      INSERT INTO api_rate_limit_windows (key_id, window_start, request_count)
      VALUES (?, ?, 1)
      ON CONFLICT(key_id, window_start) DO UPDATE SET
        request_count = MIN(request_count + 1, ?)
      RETURNING request_count
    `);
    this.prune = database.prepare("DELETE FROM api_rate_limit_windows WHERE window_start < ?");
  }

  consume(keyId) {
    if (typeof keyId !== "string" || !/^[A-Za-z0-9._-]{1,100}$/.test(keyId)) {
      throw new TypeError("Invalid API key ID");
    }
    const nowMs = this.clock();
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new TypeError("Clock must return epoch milliseconds");
    const nowSeconds = Math.floor(nowMs / 1000);
    const windowStart = Math.floor(nowSeconds / this.windowSeconds) * this.windowSeconds;
    const consume = this.database.transaction(() => {
      const { request_count: count } = this.increment.get(keyId, windowStart, this.limit + 1);
      // Bound cleanup work to a single immediately-expired window per request.
      this.prune.run(windowStart - this.windowSeconds);
      return count <= this.limit;
    });
    return consume.immediate();
  }
}
