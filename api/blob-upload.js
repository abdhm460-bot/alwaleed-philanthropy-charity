const { handleUpload } = require('@vercel/blob/client');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { ok: false, error: 'Blob storage is not configured' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return json(res, 400, { ok: false, error: 'Invalid JSON request body' }); }
    }
    if (!body || typeof body !== 'object') return json(res, 400, { ok: false, error: 'Missing upload request body' });

    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let meta = {};
        try { meta = JSON.parse(clientPayload || '{}'); } catch { throw new Error('Invalid client payload'); }
        if (meta.size != null && (!Number.isFinite(Number(meta.size)) || Number(meta.size) <= 0 || Number(meta.size) > MAX_FILE_SIZE)) {
          throw new Error('Image exceeds the 5 MB limit');
        }
        if (meta.contentType && !ALLOWED_TYPES.includes(meta.contentType)) {
          throw new Error('Unsupported image type');
        }
        if (typeof pathname !== 'string' || !pathname.startsWith('applications/') || pathname.includes('..')) {
          throw new Error('Invalid upload pathname');
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ applicationId: meta.applicationId || null, fieldName: meta.fieldName || null })
        };
      },
      onUploadCompleted: async () => undefined
    });

    return json(res, 200, response);
  } catch (error) {
    console.error('Private Blob upload authorization failed:', error);
    return json(res, 400, { ok: false, error: error instanceof Error ? error.message : 'Unable to authorize upload' });
  }
};

module.exports.config = { api: { bodyParser: true } };
