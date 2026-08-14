const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const result = {
    ok: true,
    environment: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      IBAN_ENCRYPTION_KEY: Boolean(process.env.IBAN_ENCRYPTION_KEY),
      BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN)
    }
  };

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, ...result, error: 'DATABASE_URL is not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT current_database() AS database_name, current_schema() AS schema_name`;
    result.database = { connected: true, database: rows[0].database_name, schema: rows[0].schema_name };
  } catch (error) {
    console.error('Health database check failed:', error);
    return res.status(503).json({ ok: false, ...result, database: { connected: false }, error: 'Database connection failed' });
  }

  return res.status(200).json(result);
};
