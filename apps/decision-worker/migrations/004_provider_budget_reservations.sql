-- Durable, conservative accounting for provider calls. Reserved amounts count
-- against both budgets until safely settled or explicitly released pre-request.
CREATE TABLE provider_budget_reservations (
  job_id TEXT PRIMARY KEY REFERENCES assessment_jobs(job_id),
  reserved_usd_micros INTEGER NOT NULL CHECK (reserved_usd_micros > 0),
  billed_usd_micros INTEGER CHECK (billed_usd_micros IS NULL OR billed_usd_micros >= 0),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'settled', 'released')),
  daily_window TEXT NOT NULL,
  monthly_window TEXT NOT NULL,
  reserved_at TEXT NOT NULL,
  settled_at TEXT,
  CHECK (
    (status = 'reserved' AND billed_usd_micros IS NULL AND settled_at IS NULL) OR
    (status = 'settled' AND billed_usd_micros IS NOT NULL AND settled_at IS NOT NULL) OR
    (status = 'released' AND billed_usd_micros = 0 AND settled_at IS NOT NULL)
  )
);
CREATE INDEX provider_budget_daily_window ON provider_budget_reservations(daily_window, status);
CREATE INDEX provider_budget_monthly_window ON provider_budget_reservations(monthly_window, status);
