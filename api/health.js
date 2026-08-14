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
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, ...result, error: 'DATABASE_URL is not configured' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const db = await sql`SELECT current_database() AS database_name, current_schema() AS schema_name`;
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('applications', 'application_images')
      ORDER BY table_name
    `;
    const applicationColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications'
      ORDER BY ordinal_position
    `;
    const imageColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application_images'
      ORDER BY ordinal_position
    `;

    const requiredApplications = [
      'id','transaction_number','full_name','country','marital_status','num_children','phone','email',
      'profession','monthly_income','grant_type','grant_amount','grant_description','bank_name',
      'account_holder','status','created_at','updated_at','iban_ciphertext','iban_iv','iban_auth_tag','iban_last4'
    ];
    const requiredImages = ['application_id','image_side','storage_key','mime_type','file_size'];
    const appSet = new Set(applicationColumns.map(x => x.column_name));
    const imageSet = new Set(imageColumns.map(x => x.column_name));
    const missingApplications = requiredApplications.filter(x => !appSet.has(x));
    const missingImages = requiredImages.filter(x => !imageSet.has(x));

    result.database = {
      connected: true,
      database: db[0].database_name,
      schema: db[0].schema_name,
      tables: tables.map(x => x.table_name),
      missingApplicationsColumns: missingApplications,
      missingApplicationImagesColumns: missingImages,
      schemaReady: missingApplications.length === 0 && missingImages.length === 0
    };

    if (!result.database.schemaReady) result.ok = false;
    return res.status(result.ok ? 200 : 500).json(result);
  } catch (error) {
    console.error('Health database check failed:', error);
    return res.status(503).json({ ok: false, ...result, database: { connected: false }, error: 'Database diagnostic failed' });
  }
};
