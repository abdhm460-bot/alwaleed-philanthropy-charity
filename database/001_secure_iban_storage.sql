-- Secure IBAN storage migration for the existing public.applications table.
-- Verified before migration: public.applications currently contains 0 rows.
-- Run this migration on the Neon main branch before enabling real submissions.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS iban_ciphertext text,
  ADD COLUMN IF NOT EXISTS iban_iv text,
  ADD COLUMN IF NOT EXISTS iban_auth_tag text,
  ADD COLUMN IF NOT EXISTS iban_last4 varchar(4);

ALTER TABLE public.applications DROP COLUMN IF EXISTS iban;

COMMENT ON COLUMN public.applications.iban_ciphertext IS 'AES-256-GCM encrypted IBAN ciphertext.';
COMMENT ON COLUMN public.applications.iban_iv IS 'AES-256-GCM initialization vector.';
COMMENT ON COLUMN public.applications.iban_auth_tag IS 'AES-256-GCM authentication tag.';
COMMENT ON COLUMN public.applications.iban_last4 IS 'Last four characters of the IBAN.';
