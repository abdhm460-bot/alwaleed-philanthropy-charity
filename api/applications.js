const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function getEncryptionKey() {
  const raw = process.env.IBAN_ENCRYPTION_KEY;
  if (!raw) throw new Error('IBAN_ENCRYPTION_KEY is not configured');

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('IBAN_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return key;
}

function encryptIban(iban) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(iban, 'utf8'), cipher.final()]);

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    last4: iban.slice(-4)
  };
}

function normalizeIban(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateInput(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body';
  if (!isUuid(body.applicationId)) return 'Invalid applicationId';
  if (typeof body.transactionNumber !== 'string' || body.transactionNumber.length < 5 || body.transactionNumber.length > 80) {
    return 'Invalid transactionNumber';
  }
  if (!body.payload || typeof body.payload !== 'object') return 'Missing application payload';
  if (!body.images || typeof body.images !== 'object' || !body.images.idCardFront || !body.images.idCardBack) {
    return 'Both identity images are required';
  }
  return null;
}

function validImageRecord(value) {
  return value &&
    typeof value.pathname === 'string' &&
    /^applications\/[0-9a-f-]{36}\/(idCardFront|idCardBack)(?:-[A-Za-z0-9_-]+)?\.(jpg|png|webp)$/i.test(value.pathname) &&
    ['image/jpeg', 'image/png', 'image/webp'].includes(value.contentType) &&
    Number.isInteger(value.size) && value.size > 0 && value.size <= 5 * 1024 * 1024;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const validationError = validateInput(req.body);
    if (validationError) return json(res, 400, { ok: false, error: validationError });
    if (!process.env.DATABASE_URL) return json(res, 503, { ok: false, error: 'DATABASE_URL is not configured' });

    const payload = JSON.parse(JSON.stringify(req.body.payload));
    const banking = payload.bankingInfo || {};
    const iban = normalizeIban(banking.iban);

    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
      return json(res, 400, { ok: false, error: 'Invalid IBAN format' });
    }

    if (!validImageRecord(req.body.images.idCardFront) || !validImageRecord(req.body.images.idCardBack)) {
      return json(res, 400, { ok: false, error: 'Invalid identity image metadata' });
    }

    const frontPrefix = `applications/${req.body.applicationId}/idCardFront`;
    const backPrefix = `applications/${req.body.applicationId}/idCardBack`;
    if (!req.body.images.idCardFront.pathname.startsWith(frontPrefix) || !req.body.images.idCardBack.pathname.startsWith(backPrefix)) {
      return json(res, 400, { ok: false, error: 'Identity image does not belong to this application' });
    }

    delete payload.bankingInfo.iban;

    const encrypted = encryptIban(iban);
    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      INSERT INTO grant_applications (
        application_id,
        transaction_number,
        application_data,
        iban_ciphertext,
        iban_iv,
        iban_auth_tag,
        iban_last4,
        id_card_front_path,
        id_card_back_path,
        created_at
      )
      VALUES (
        ${req.body.applicationId}::uuid,
        ${req.body.transactionNumber},
        ${JSON.stringify(payload)}::jsonb,
        ${encrypted.ciphertext},
        ${encrypted.iv},
        ${encrypted.authTag},
        ${encrypted.last4},
        ${req.body.images.idCardFront.pathname},
        ${req.body.images.idCardBack.pathname},
        NOW()
      )
      RETURNING application_id, transaction_number, created_at
    `;

    return json(res, 201, {
      ok: true,
      applicationId: result[0].application_id,
      transactionNumber: result[0].transaction_number,
      createdAt: result[0].created_at
    });
  } catch (error) {
    console.error('Application storage failed:', error);
    return json(res, 500, { ok: false, error: 'Unable to save application' });
  }
};
