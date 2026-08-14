const crypto = require('crypto');
const { get, list } = require('@vercel/blob');

function requireAdmin(req) {
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  const supplied = req.headers['x-admin-password'];
  if (!expected || typeof supplied !== 'string') return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isAllowedPath(pathname) {
  return /^applications\/[0-9a-f-]{36}\/(idCardFront|idCardBack)\.(jpg|png|webp)$/i.test(pathname);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!requireAdmin(req)) return res.status(401).send('Unauthorized');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).send('Blob storage is not configured');

  const pathname = typeof req.query?.pathname === 'string' ? req.query.pathname : '';
  if (!isAllowedPath(pathname)) return res.status(400).send('Invalid image path');

  try {
    // Determine the store access mode from the blob metadata, then read it server-side.
    const listed = await list({ prefix: pathname, limit: 1 });
    const blob = listed.blobs?.find((item) => item.pathname === pathname) || listed.blobs?.[0];
    if (!blob || blob.pathname !== pathname) return res.status(404).send('Image not found');

    const access = blob.url.includes('.private.blob.vercel-storage.com') ? 'private' : 'public';
    const result = await get(pathname, { access });
    if (!result || result.statusCode !== 200) return res.status(404).send('Image not found');

    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return require('stream').Readable.fromWeb(result.stream).pipe(res);
  } catch (error) {
    console.error('ADMIN_IMAGE_ERROR', { name: error?.name, code: error?.code, message: error?.message });
    return res.status(404).send('Image unavailable');
  }
};
