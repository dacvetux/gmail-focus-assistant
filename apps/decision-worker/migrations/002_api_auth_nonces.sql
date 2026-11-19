-- Durable replay protection for Focuna HMAC v1.
-- The runtime reserves a nonce transactionally before route dispatch.
CREATE TABLE api_auth_nonces (
  key_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (key_id, nonce)
) WITHOUT ROWID;

CREATE INDEX api_auth_nonces_expiry ON api_auth_nonces(expires_at);
