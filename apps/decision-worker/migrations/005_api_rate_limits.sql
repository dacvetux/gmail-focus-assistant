-- Durable per-integration fixed-window counters shared across worker restarts.
CREATE TABLE api_rate_limit_windows (
  key_id TEXT NOT NULL,
  window_start INTEGER NOT NULL CHECK (window_start >= 0),
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (key_id, window_start)
);
CREATE INDEX api_rate_limit_window_cleanup ON api_rate_limit_windows(window_start);
