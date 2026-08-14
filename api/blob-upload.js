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
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { ok: false, error: 'Blob storage is not configured' });

  try {
    const body = req.body || {};
    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let meta;
        try { meta = JSON.parse(clientPayload || '{}'); } catch { throw new Error('Invalid client payload'); }
        const { applicationId, fieldName, contentType, size } = meta;
        if (!isUuid(applicationId)) throw new Error('Invalid applicationId');
        if (!ALLOWED_FIELDS.has(fieldName)) throw new Error('Invalid identity image field');
        if (!ALLOWED_TYPES.has(contentType)) throw new Error('Unsupported image type');
        if (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_SIZE) throw new Error('Image exceeds the 5 MB limit');
        const expectedPrefix = `applications/${applicationId}/${fieldName}`;
        const expectedExtension = EXTENSIONS[contentType];
        if (typeof pathname !== 'string' || !pathname.startsWith(expectedPrefix) || !pathname.endsWith(expectedExtension) || pathname.includes('..')) {
          throw new Error('Invalid upload pathname');
        }
        return {
          allowedContentTypes: Array.from(ALLOWED_TYPES),
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ applicationId, fieldName })
        };
      }
    });
    return json(res, 200, response);
  } catch (error) {
    console.error('Private Blob upload authorization failed:', error);
    return json(res, 400, { ok: false, error: error instanceof Error ? error.message : 'Unable to authorize upload' });
  }
};