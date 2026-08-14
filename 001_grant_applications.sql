-- Secure grant application storage.
-- IBAN is application-side AES-256-GCM encrypted before insertion.
-- Identity images are stored in a Private Vercel Blob store.

CREATE TABLE IF NOT EXISTS grant_applications (
  application_id UUID PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  application_data JSONB NOT NULL,
  iban_ciphertext TEXT NOT NULL,
  iban_iv TEXT NOT NULL,
  iban_auth_tag TEXT NOT NULL,
  iban_last4 CHAR(4) NOT NULL,
  id_card_front_path TEXT NOT NULL,
  id_card_back_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grant_applications_created_at_idx
  ON grant_applications (created_at DESC);

COMMENT ON TABLE grant_applications IS
  'Authorized grant applications. IBAN is encrypted before database insertion; identity images are stored in Private Vercel Blob.';
