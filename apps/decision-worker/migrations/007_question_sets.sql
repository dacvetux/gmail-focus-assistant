-- Immutable worker-owned assessment question sets, pinned by version and task.
CREATE TABLE question_sets (
  version TEXT NOT NULL,
  task TEXT NOT NULL CHECK (task IN ('classification', 'workflow', 'rule-suggestion')),
  digest TEXT NOT NULL CHECK (length(digest) = 64),
  record_json TEXT NOT NULL CHECK (json_valid(record_json)),
  registered_at TEXT NOT NULL,
  PRIMARY KEY (version, task)
);

CREATE TRIGGER question_sets_no_update
BEFORE UPDATE ON question_sets BEGIN
  SELECT RAISE(ABORT, 'question sets are immutable');
END;
CREATE TRIGGER question_sets_no_delete
BEFORE DELETE ON question_sets BEGIN
  SELECT RAISE(ABORT, 'question sets are immutable');
END;
