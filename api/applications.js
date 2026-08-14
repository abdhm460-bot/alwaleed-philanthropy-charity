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
  if (key.length !== 32) throw new Error('IBAN_ENCRYPTION_KEY must decode to exactly 32 bytes');
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
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validImageRecord(value, fieldName, applicationId) {
  if (!value || typeof value !== 'object') return false;
  const expectedPrefix = `applications/${applicationId}/${fieldName}`;
  return typeof value.pathname === 'string' &&
    value.pathname.startsWith(expectedPrefix) &&
    !value.pathname.includes('..') &&
    ['image/jpeg', 'image/png', 'image/webp'].includes(value.contentType) &&
    Number.isInteger(value.size) && value.size > 0 && value.size <= 5 * 1024 * 1024;
}

function cleanText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const body = req.body || {};
    if (!isUuid(body.applicationId)) return json(res, 400, { ok: false, error: 'Invalid applicationId' });
    if (typeof body.transactionNumber !== 'string' || body.transactionNumber.length < 5 || body.transactionNumber.length > 80) {
      return json(res, 400, { ok: false, error: 'Invalid transactionNumber' });
    }
    if (!body.payload || typeof body.payload !== 'object') return json(res, 400, { ok: false, error: 'Missing application payload' });
    if (!body.images?.idCardFront || !body.images?.idCardBack) return json(res, 400, { ok: false, error: 'Both identity images are required' });
    if (!process.env.DATABASE_URL) return json(res, 503, { ok: false, error: 'DATABASE_URL is not configured' });

    const p = body.payload;
    const personal = p.personalInfo || {};
    const contact = p.contactCareer || {};
    const grant = p.grantDetails || {};
    const banking = p.bankingInfo || {};
    const iban = normalizeIban(banking.iban);

    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
      return json(res, 400, { ok: false, error: 'Invalid IBAN format' });
    }
    if (!validImageRecord(body.images.idCardFront, 'idCardFront', body.applicationId) ||
        !validImageRecord(body.images.idCardBack, 'idCardBack', body.applicationId)) {
      return json(res, 400, { ok: false, error: 'Invalid identity image metadata' });
    }

    const encrypted = encryptIban(iban);
    const sql = neon(process.env.DATABASE_URL);
    const applicationData = {
      personalInfo: personal,
      contactCareer: contact,
      grantDetails: grant,
      bankingInfo: {
        ...banking,
        iban: undefined
      }
    };
    delete applicationData.bankingInfo.iban;

    const application = await sql`
      INSERT INTO public.grant_applications (
        application_id,
        transaction_number,
        application_data,
        iban_ciphertext,
        iban_iv,
        iban_auth_tag,
        iban_last4,
        id_card_front_path,
        id_card_back_path
      ) VALUES (
        ${body.applicationId}::uuid,
        ${cleanText(body.transactionNumber, 80)},
        ${JSON.stringify(applicationData)}::jsonb,
        ${encrypted.ciphertext},
        ${encrypted.iv},
        ${encrypted.authTag},
        ${encrypted.last4},
        ${body.images.idCardFront.pathname},
        ${body.images.idCardBack.pathname}
      )
      RETURNING application_id, transaction_number, created_at
    `;

    return json(res, 201, {
      ok: true,
      applicationId: application[0].application_id,
      transactionNumber: application[0].transaction_number,
      createdAt: application[0].created_at
    });
  } catch (error) {
    console.error('Application storage failed:', error);
    return json(res, 500, { ok: false, error: 'Unable to save application' });
  }
};
