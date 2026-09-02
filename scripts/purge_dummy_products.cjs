const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

function isDummyProduct(p) {
  const n = (p.nameUz || '').trim().toLowerCase();
  if (!n) return true;
  
  // 0, 00, 0., 0.0, etc.
  if (/^0+[\.\,0]*$/.test(n)) return true;
  
  // ., .., ..., symbols only
  if (/^[\.\,\-\_\s\*\#\?\!\:\;]+$/.test(n)) return true;
  
  // Small numbers like 1, 1., 2, 2., 3.
  if (/^\d{1,2}\.?$/.test(n)) return true;
  
  // "nomi", "nom", "tovar", "tovar nomi", "mahsulot nomi", "name", "product"
  if (/^(nomi|nom|tovar|tovar nomi|mahsulot nomi|name|product)$/i.test(n)) return true;
  
  // "yoq", "yo", "yo'q", "yo`q", "y9o", "yl", "yok", "net", "netu"
  if (/^(yoq|yo|yo'q|yo`q|y9o|yl|yok|net|netu)$/i.test(n)) return true;
  
  // Dummy repeated letters: 'x', 'xx', 'xxx', 'xxxx', 'xxxxx', 'v', 'vv', 'b', 'm', 'c', 'aa', 'zz'
  if (/^(x+|v+|b|m|c|aa|zz|q|w|y|z|k|j|p|s|t|l|n|r|g|d)$/i.test(n)) return true;
  
  return false;
}

async function cleanAndSync() {
  const filePath = path.join(process.cwd(), 'src/data/all_clean_products.json');
  const prods = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const removed = prods.filter(isDummyProduct);
  const cleanList = prods.filter(p => !isDummyProduct(p));

  console.log(`Original count: ${prods.length}`);
  console.log(`Removed dummy/placeholder items (0, nuqta, nomi, yoq, va xato tovarlar): ${removed.length}`);
  console.log(`Remaining clean products: ${cleanList.length}`);

  // Save back to json file
  fs.writeFileSync(filePath, JSON.stringify(cleanList, null, 2), 'utf8');
  console.log(`💾 Saved ${cleanList.length} clean products to ${filePath}`);

  // Sync to PostgreSQL
  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    console.log('🗄️ Cleaning PostgreSQL database...');

    await client.query('DELETE FROM products_db');

    const batchSize = 250;
    for (let i = 0; i < cleanList.length; i += batchSize) {
      const batch = cleanList.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];

      batch.forEach((prod, pIdx) => {
        const offset = pIdx * 2;
        placeholders.push(`($${offset + 1}, $${offset + 2}, NOW())`);
        values.push(prod.id, JSON.stringify(prod));
      });

      const query = `INSERT INTO products_db (id, data, updated_at) VALUES ${placeholders.join(', ')} ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      await client.query(query, values);
      process.stdout.write(`\r📥 Inserted ${Math.min(i + batchSize, cleanList.length)} / ${cleanList.length} products into PostgreSQL...`);
    }

    console.log('\n✅ PostgreSQL products_db successfully updated!');
    client.release();
    await pool.end();
  } catch (err) {
    console.error('PostgreSQL Sync error:', err.message);
  }

  console.log('🎉 Tozalash toliq yakunlandi!');
}

cleanAndSync();
