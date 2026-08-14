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
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), last4: iban.slice(-4) };
}
function normalizeIban(value) { return String(value || '').replace(/\s+/g, '').toUpperCase(); }
function isUuid(value) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function validImageRecord(value, fieldName, applicationId) {
  if (!value || typeof value !== 'object') return false;
  const expectedPrefix = `applications/${applicationId}/${fieldName}`;
  return typeof value.pathname === 'string' && value.pathname.startsWith(expectedPrefix) && !value.pathname.includes('..') && ['image/jpeg', 'image/png', 'image/webp'].includes(value.contentType) && Number.isInteger(value.size) && value.size > 0 && value.size <= 5 * 1024 * 1024;
}
function cleanText(value, max = 500) { return String(value ?? '').trim().slice(0, max); }
function optionalNumber(value) { if (value === '' || value === null || value === undefined) return null; const n = Number(value); return Number.isFinite(n) ? n : null; }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = req.body || {};
    if (!isUuid(body.applicationId)) return json(res, 400, { ok: false, error: 'Invalid applicationId' });
    if (typeof body.transactionNumber !== 'string' || body.transactionNumber.length < 5 || body.transactionNumber.length > 80) return json(res, 400, { ok: false, error: 'Invalid transactionNumber' });
    if (!body.payload || typeof body.payload !== 'object') return json(res, 400, { ok: false, error: 'Missing application payload' });
    if (!body.images?.idCardFront || !body.images?.idCardBack) return json(res, 400, { ok: false, error: 'Both identity images are required' });
    if (!process.env.DATABASE_URL) return json(res, 503, { ok: false, error: 'DATABASE_URL is not configured' });

    const p = body.payload, personal = p.personalInfo || {}, contact = p.contactCareer || {}, grant = p.grantDetails || {}, banking = p.bankingInfo || {};
    const iban = normalizeIban(banking.iban);
    if (!cleanText(personal.fullName, 200)) return json(res, 400, { ok: false, error: 'Full name is required' });
    if (!cleanText(contact.phone, 50)) return json(res, 400, { ok: false, error: 'Phone is required' });
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return json(res, 400, { ok: false, error: 'Invalid IBAN format' });
    if (!validImageRecord(body.images.idCardFront, 'idCardFront', body.applicationId) || !validImageRecord(body.images.idCardBack, 'idCardBack', body.applicationId)) return json(res, 400, { ok: false, error: 'Invalid identity image metadata' });

    const encrypted = encryptIban(iban);
    const sql = neon(process.env.DATABASE_URL);
    const application = await sql`
      INSERT INTO public.applications (
        id, transaction_number, full_name, country, marital_status, num_children, phone, email,
        profession, monthly_income, grant_type, grant_amount, grant_description, bank_name,
        account_holder, status, created_at, updated_at, iban_ciphertext, iban_iv, iban_auth_tag, iban_last4
      ) VALUES (
        ${body.applicationId}::uuid, ${cleanText(body.transactionNumber, 80)}, ${cleanText(personal.fullName, 200)},
        ${cleanText(personal.country || personal.otherCountry, 100) || null}, ${cleanText(personal.maritalStatus, 100) || null},
        ${optionalNumber(personal.numChildren)}, ${cleanText(contact.phone, 50)}, ${cleanText(contact.email, 320) || null},
        ${cleanText(contact.profession, 200) || null}, ${optionalNumber(contact.income)}, ${cleanText(grant.grantType, 200) || null},
        ${optionalNumber(grant.grantAmount)}, ${cleanText(grant.grantDescription, 2000) || null}, ${cleanText(banking.bankName || banking.otherBank, 200) || null},
        ${cleanText(banking.accountHolder, 200) || null}, 'pending', NOW(), NOW(), ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag}, ${encrypted.last4}
      ) RETURNING id, transaction_number, created_at
    `;

    await sql`
      INSERT INTO public.application_images (application_id, image_side, storage_key, mime_type, file_size)
      VALUES
        (${body.applicationId}::uuid, 'front', ${body.images.idCardFront.pathname}, ${body.images.idCardFront.contentType}, ${body.images.idCardFront.size}),
        (${body.applicationId}::uuid, 'back', ${body.images.idCardBack.pathname}, ${body.images.idCardBack.contentType}, ${body.images.idCardBack.size})
    `;

    return json(res, 201, { ok: true, applicationId: application[0].id, transactionNumber: application[0].transaction_number, createdAt: application[0].created_at });
  } catch (error) {
    console.error('Application storage failed:', error);
    return json(res, 500, { ok: false, error: 'Unable to save application' });
  }
};