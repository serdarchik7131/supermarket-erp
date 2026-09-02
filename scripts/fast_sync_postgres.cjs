const fs = require('fs');
const pg = require('pg');
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const dbPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runFastSync() {
  console.log('⚡ Starting high-speed PostgreSQL batch synchronization...');
  const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));
  console.log(`📦 Loaded ${products.length} products to sync.`);

  const client = await dbPool.connect();
  try {
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const chunk = products.slice(i, i + batchSize);
      
      const values = [];
      const placeholders = [];
      chunk.forEach((p, idx) => {
        const offset = idx * 2;
        placeholders.push(`($${offset + 1}, $${offset + 2}, NOW())`);
        values.push(p.id, JSON.stringify(p));
      });

      const sql = `
        INSERT INTO products_db (id, data, updated_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
      `;

      await client.query(sql, values);
      process.stdout.write(`\r✅ Synced ${Math.min(i + batchSize, products.length)} / ${products.length} products`);
    }

    console.log('\n🎉 Fast synchronization completed successfully!');
    const res = await client.query('SELECT COUNT(*) FROM products_db');
    console.log(`📊 Total products in PostgreSQL database: ${res.rows[0].count}`);
  } catch (err) {
    console.error('\n❌ Fast sync error:', err.message);
  } finally {
    client.release();
    await dbPool.end();
  }
}

runFastSync();
