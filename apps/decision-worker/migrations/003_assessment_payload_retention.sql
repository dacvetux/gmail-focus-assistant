-- Minimized submission payload is retained only while an assessment is active.
ALTER TABLE assessment_jobs ADD COLUMN payload_json TEXT
  CHECK (payload_json IS NULL OR json_valid(payload_json));
ALTER TABLE assessment_jobs ADD COLUMN payload_expires_at TEXT;
CREATE INDEX assessment_jobs_payload_expiry ON assessment_jobs(payload_expires_at)
  WHERE payload_json IS NOT NULL;
