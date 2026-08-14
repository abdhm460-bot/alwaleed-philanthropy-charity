const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const { list } = require('@vercel/blob');

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function requireAdmin(req) {
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  const supplied = req.headers['x-admin-password'];
  if (!expected || typeof supplied !== 'string') return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function decryptIban(row) {
  const raw = process.env.IBAN_ENCRYPTION_KEY;
  if (!raw) throw new Error('IBAN_ENCRYPTION_KEY is not configured');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('Invalid IBAN encryption key');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(row.iban_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(row.iban_auth_tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(row.iban_ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!requireAdmin(req)) return json(res, 401, { ok: false, error: 'UNAUTHORIZED' });
  if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { ok: false, error: 'ADMIN_ENV_NOT_CONFIGURED' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const id = typeof req.query?.id === 'string' ? req.query.id : null;
    const rows = id
      ? await sql`SELECT id, transaction_number, full_name, country, phone, email, profession, grant_type, grant_amount, status, created_at, iban_ciphertext, iban_iv, iban_auth_tag, iban_last4 FROM public.applications WHERE id = ${id}::uuid LIMIT 1`
      : await sql`SELECT id, transaction_number, full_name, country, phone, email, profession, grant_type, grant_amount, status, created_at, iban_last4 FROM public.applications ORDER BY created_at DESC LIMIT 100`;

    if (id && rows.length === 0) return json(res, 404, { ok: false, error: 'NOT_FOUND' });

    if (!id) return json(res, 200, { ok: true, applications: rows });

    const application = rows[0];
    const images = await sql`SELECT image_side, storage_key, mime_type, file_size FROM public.application_images WHERE application_id = ${id}::uuid ORDER BY image_side`;
    const blobs = [];
    for (const image of images) {
      const result = await list({ prefix: image.storage_key, limit: 1 });
      const blob = result.blobs?.find((b) => b.pathname === image.storage_key) || result.blobs?.[0];
      blobs.push({
        side: image.image_side,
        pathname: image.storage_key,
        mimeType: image.mime_type,
        size: image.file_size,
        url: blob?.url || null
      });
    }

    const iban = decryptIban(application);
    delete application.iban_ciphertext;
    delete application.iban_iv;
    delete application.iban_auth_tag;

    return json(res, 200, { ok: true, application: { ...application, iban }, images: blobs });
  } catch (error) {
    console.error('ADMIN_APPLICATIONS_ERROR', { name: error?.name, code: error?.code, message: error?.message });
    return json(res, 500, { ok: false, error: 'ADMIN_REQUEST_FAILED' });
  }
};
