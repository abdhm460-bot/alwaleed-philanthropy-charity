const { handleUpload } = require('@vercel/blob/client');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_FIELDS = new Set(['idCardFront', 'idCardBack']);
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

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

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object') return json(res, 400, { ok: false, error: 'INVALID_JSON_BODY' });

    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (typeof pathname !== 'string') throw new Error('INVALID_UPLOAD_PATH');
        const match = /^applications\/([0-9a-f-]{36})\/(idCardFront|idCardBack)\.(jpg|png|webp)$/i.exec(pathname);
        if (!match) throw new Error('INVALID_UPLOAD_PATH');
        const applicationId = match[1];
        const fieldName = match[2];
        const extension = '.' + match[3].toLowerCase();
        if (!isUuid(applicationId)) throw new Error('INVALID_APPLICATION_ID');
        if (!ALLOWED_FIELDS.has(fieldName)) throw new Error('INVALID_IMAGE_FIELD');

        let meta = {};
        if (clientPayload) {
          try { meta = JSON.parse(clientPayload); } catch { throw new Error('INVALID_CLIENT_PAYLOAD'); }
        }
        const contentType = typeof meta.contentType === 'string' ? meta.contentType.toLowerCase() : null;
        const size = meta.size;
        const expectedExtension = contentType ? EXTENSIONS[contentType] : extension;
        if (contentType && (!ALLOWED_TYPES.has(contentType) || expectedExtension !== extension)) throw new Error('UNSUPPORTED_IMAGE_TYPE');
        if (size !== undefined && (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_SIZE)) throw new Error('IMAGE_SIZE_LIMIT');

        return {
          allowedContentTypes: contentType ? [contentType] : Array.from(ALLOWED_TYPES),
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ applicationId, fieldName })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('BLOB_UPLOAD_COMPLETED', { pathname: blob?.pathname, tokenPayload });
      }
    });

    return json(res, 200, response);
  } catch (error) {
    console.error('BLOB_UPLOAD_ERROR', { name: error?.name, message: error?.message, code: error?.code });
    return json(res, 400, { ok: false, error: error?.message || 'BLOB_UPLOAD_FAILED' });
  }
};

module.exports.config = { api: { bodyParser: true } };
