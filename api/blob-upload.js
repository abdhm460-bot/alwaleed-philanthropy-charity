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
        let meta = {};
        try { meta = JSON.parse(clientPayload || '{}'); } catch { throw new Error('INVALID_CLIENT_PAYLOAD'); }
        const { applicationId, fieldName, contentType, size } = meta;
        if (!isUuid(applicationId)) throw new Error('INVALID_APPLICATION_ID');
        if (!ALLOWED_FIELDS.has(fieldName)) throw new Error('INVALID_IMAGE_FIELD');
        if (!ALLOWED_TYPES.has(contentType)) throw new Error('UNSUPPORTED_IMAGE_TYPE');
        if (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_SIZE) throw new Error('IMAGE_SIZE_LIMIT');
        const expectedPrefix = `applications/${applicationId}/${fieldName}.`;
        const expectedExtension = EXTENSIONS[contentType];
        if (typeof pathname !== 'string' || !pathname.startsWith(expectedPrefix) || !pathname.endsWith(expectedExtension) || pathname.includes('..')) {
          throw new Error('INVALID_UPLOAD_PATH');
        }
        return {
          allowedContentTypes: [contentType],
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

module.exports.config = { api: { bodyParser: { sizeLimit: '1mb' } } };
