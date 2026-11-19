/** Atomic, conservative TypeSafe spend reservations for the one-worker queue. */
export class SqliteProviderBudget {
  constructor(database, {
    dailyLimitUsdMicros = 2_000_000,
    monthlyLimitUsdMicros = 25_000_000,
    maxCallUsdMicros = 252,
  } = {}) {
    for (const [name, value] of Object.entries({ dailyLimitUsdMicros, monthlyLimitUsdMicros, maxCallUsdMicros })) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive safe integer`);
    }
    this.database = database;
    this.dailyLimitUsdMicros = dailyLimitUsdMicros;
    this.monthlyLimitUsdMicros = monthlyLimitUsdMicros;
    this.maxCallUsdMicros = maxCallUsdMicros;
    this.find = database.prepare("SELECT * FROM provider_budget_reservations WHERE job_id = ?");
    this.sumDaily = database.prepare(`
      SELECT COALESCE(SUM(CASE WHEN status = 'reserved' THEN reserved_usd_micros ELSE billed_usd_micros END), 0) AS amount
      FROM provider_budget_reservations WHERE daily_window = ? AND status IN ('reserved', 'settled')
    `);
    this.sumMonthly = database.prepare(`
      SELECT COALESCE(SUM(CASE WHEN status = 'reserved' THEN reserved_usd_micros ELSE billed_usd_micros END), 0) AS amount
      FROM provider_budget_reservations WHERE monthly_window = ? AND status IN ('reserved', 'settled')
    `);
    this.insert = database.prepare(`
      INSERT INTO provider_budget_reservations (
        job_id, reserved_usd_micros, status, daily_window, monthly_window, reserved_at
      ) VALUES (?, ?, 'reserved', ?, ?, ?)
    `);
    this.settleStatement = database.prepare(`
      UPDATE provider_budget_reservations SET status = 'settled', billed_usd_micros = ?, settled_at = ?
      WHERE job_id = ? AND status = 'reserved' AND ? <= reserved_usd_micros
    `);
    this.releaseStatement = database.prepare(`
      UPDATE provider_budget_reservations SET status = 'released', billed_usd_micros = 0, settled_at = ?
      WHERE job_id = ? AND status = 'reserved'
    `);
  }

  /**
   * Reserve the maximum pinned-model charge before dispatch. Existing jobs are
   * returned without a second reservation; callers must never redispatch them.
   */
  reserve(jobId, at) {
    if (typeof jobId !== "string" || jobId.length < 16 || jobId.length > 80) throw new TypeError("Invalid assessment job ID");
    const instant = parseInstant(at);
    const day = instant.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    const reserve = this.database.transaction(() => {
      const existing = this.find.get(jobId);
      if (existing) return { allowed: false, reason: "ALREADY_RESERVED", reservation: existing };
      if (this.maxCallUsdMicros > this.dailyLimitUsdMicros || this.maxCallUsdMicros > this.monthlyLimitUsdMicros) {
        return { allowed: false, reason: "CALL_EXCEEDS_BUDGET" };
      }
      const daily = this.sumDaily.get(day).amount;
      if (daily + this.maxCallUsdMicros > this.dailyLimitUsdMicros) return { allowed: false, reason: "DAILY_BUDGET_EXCEEDED" };
      const monthly = this.sumMonthly.get(month).amount;
      if (monthly + this.maxCallUsdMicros > this.monthlyLimitUsdMicros) return { allowed: false, reason: "MONTHLY_BUDGET_EXCEEDED" };
      this.insert.run(jobId, this.maxCallUsdMicros, day, month, instant.toISOString());
      return { allowed: true, reservation: this.find.get(jobId) };
    });
    return reserve.immediate();
  }

  /** Settle with provider-reported charge, or the reserved maximum if usage is unknown. */
  settle(jobId, billedUsdMicros, at) {
    if (!Number.isSafeInteger(billedUsdMicros) || billedUsdMicros < 0) throw new TypeError("Invalid billed amount");
    const instant = parseInstant(at).toISOString();
    const settle = this.database.transaction(() => {
      const existing = this.find.get(jobId);
      if (!existing) throw new Error("Provider budget reservation does not exist");
      if (existing.status === "settled") {
        if (existing.billed_usd_micros !== billedUsdMicros) throw new Error("Conflicting provider budget settlement");
        return existing;
      }
      if (existing.status !== "reserved") throw new Error("Provider budget reservation is not active");
      const updated = this.settleStatement.run(billedUsdMicros, instant, jobId, billedUsdMicros).changes;
      if (updated !== 1) throw new Error("Billed amount exceeds reserved maximum; budget remains held");
      return this.find.get(jobId);
    });
    return settle.immediate();
  }

  /** Release only when the caller can prove no provider request was sent. */
  releaseBeforeDispatch(jobId, at, { requestDefinitelyNotSent } = {}) {
    if (requestDefinitelyNotSent !== true) throw new Error("A provider reservation may only be released before dispatch is proven absent");
    const instant = parseInstant(at).toISOString();
    const release = this.database.transaction(() => {
      const existing = this.find.get(jobId);
      if (!existing) throw new Error("Provider budget reservation does not exist");
      if (existing.status === "released") return existing;
      if (existing.status !== "reserved") throw new Error("Provider budget reservation is not active");
      this.releaseStatement.run(instant, jobId);
      return this.find.get(jobId);
    });
    return release.immediate();
  }
}

/** $42 / 1B input tokens, rounded up to whole microdollars per call. */
export function estimateTypeSafeInputCostUsdMicros(inputTokens) {
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || inputTokens > 6_000) {
    throw new TypeError("Input token count must be an integer from 0 to 6000");
  }
  return Math.ceil(inputTokens * 42 / 1_000);
}

function parseInstant(value) {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new TypeError("A valid ISO timestamp is required");
  return new Date(millis);
}
