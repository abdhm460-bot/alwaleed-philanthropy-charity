const { put } = require('@vercel/blob');

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const ALLOWED_FIELDS = new Set(['idCardFront', 'idCardBack']);

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { ok: false, error: 'BLOB_TOKEN_MISSING' });

  const applicationId = typeof req.query?.applicationId === 'string' ? req.query.applicationId : '';
  const fieldName = typeof req.query?.fieldName === 'string' ? req.query.fieldName : '';
  const contentType = String(req.headers['content-type'] || '').toLowerCase().split(';')[0];
  const declaredSize = Number(req.headers['x-file-size'] || 0);

  if (!isUuid(applicationId)) return json(res, 400, { ok: false, error: 'INVALID_APPLICATION_ID' });
  if (!ALLOWED_FIELDS.has(fieldName)) return json(res, 400, { ok: false, error: 'INVALID_IMAGE_FIELD' });
  if (!ALLOWED[contentType]) return json(res, 400, { ok: false, error: 'UNSUPPORTED_IMAGE_TYPE' });
  if (!Number.isInteger(declaredSize) || declaredSize <= 0 || declaredSize > MAX_FILE_SIZE) return json(res, 400, { ok: false, error: 'IMAGE_SIZE_LIMIT' });

  try {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_FILE_SIZE) return json(res, 413, { ok: false, error: 'IMAGE_SIZE_LIMIT' });
      chunks.push(Buffer.from(chunk));
    }

    if (total !== declaredSize) return json(res, 400, { ok: false, error: 'IMAGE_SIZE_MISMATCH' });

    const blob = await put(
      `applications/${applicationId}/${fieldName}${ALLOWED[contentType]}`,
      Buffer.concat(chunks),
      {
        access: 'private',
        contentType,
        addRandomSuffix: false,
      }
    );

    return json(res, 200, {
      ok: true,
      pathname: blob.pathname,
      contentType,
      size: total,
    });
  } catch (error) {
    console.error('DIRECT_BLOB_UPLOAD_ERROR', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });
    return json(res, 500, { ok: false, error: 'IMAGE_UPLOAD_FAILED' });
  }
};

module.exports.config = { api: { bodyParser: false } };
