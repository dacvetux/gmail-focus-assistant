-- Retain content-free result/job metadata for 30 days from terminal time.
ALTER TABLE assessment_jobs ADD COLUMN terminal_at TEXT;
UPDATE assessment_jobs SET terminal_at = created_at
WHERE status IN ('completed', 'failed', 'expired') AND terminal_at IS NULL;
CREATE INDEX assessment_jobs_terminal_retention ON assessment_jobs(terminal_at)
  WHERE terminal_at IS NOT NULL;
