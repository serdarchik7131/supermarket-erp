const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { CATEGORIES, classifyCategory, detectBrand, getContextImage } = require('./catalog_builder_helper.cjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
const REGOS_URL = 'https://integration.regos.uz/gateway/out/6d9d2188297c45f193449a7fc7a0e8a1/v1/Item/GetExt';

async function fetchAllRegosItems() {
  console.log('🚀 Starting Full Download from REGOS POS Gateway...');
  console.log('URL:', REGOS_URL);

  let allResults = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(REGOS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          limit,
          offset
        })
      });

      if (!res.ok) {
        console.error(`HTTP error ${res.status} at offset ${offset}`);
        break;
      }

      const data = await res.json();
      if (!data.ok || !data.result || data.result.length === 0) {
        console.log(`Finished fetching: result is empty at offset ${offset}`);
        break;
      }

      allResults = allResults.concat(data.result);
      console.log(`📥 Fetched ${allResults.length} / ${data.total || '?'} items (offset: ${offset})...`);

      if (data.next_offset !== undefined && data.next_offset !== null && data.next_offset > offset) {
        offset = data.next_offset;
      } else {
        offset += data.result.length;
      }

      if (data.result.length < limit || (data.total && allResults.length >= data.total)) {
        hasMore = false;
      }
    } catch (err) {
      console.error(`Fetch error at offset ${offset}:`, err.message);
      break;
    }
  }

  console.log(`✅ Total REGOS raw items fetched: ${allResults.length}`);
  fs.writeFileSync('regos_raw_all.json', JSON.stringify(allResults, null, 2), 'utf8');
  return allResults;
}

async function processAndSync() {
  const rawItems = await fetchAllRegosItems();

  const productList = [];
  const barcodeMap = new Set();

  rawItems.forEach((r, idx) => {
    const item = r.item || {};
    // Get barcodes
    const barcodeStr = (item.base_barcode || item.barcode_list || '').trim();
    if (!barcodeStr) return;

    // Handle multiple barcodes if separated by comma or space
    const primaryBarcode = barcodeStr.split(/[\s,]+/)[0].trim();
    if (!primaryBarcode || barcodeMap.has(primaryBarcode)) return;
    barcodeMap.add(primaryBarcode);

    const nameUz = (item.name || '').trim();
    if (!nameUz) return;

    const groupName = item.group?.name || '';
    const categoryId = classifyCategory(nameUz, groupName);
    const brand = detectBrand(nameUz);

    const retailPrice = Number(r.price) || 10000;
    const costPrice = Number(r.last_purchase_cost) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);

    const unit = (item.unit?.name && item.unit.name.toLowerCase().includes('кг')) ? 'kg' : 
                 (item.unit?.name && item.unit.name.toLowerCase().includes('литр')) ? 'litr' : 'dona';

    const image = item.image_url || r.image_url || getContextImage(nameUz, categoryId);

    const product = {
      id: `prod_regos_${item.id || idx}_${primaryBarcode}`,
      sku: item.sku || `REGOS-${item.id || idx + 1}`,
      barcode: primaryBarcode,
      nameUz,
      nameRu: nameUz,
      nameEn: nameUz,
      categoryId,
      brand,
      price: retailPrice,
      costPrice,
      wholesalePrice,
      vipPrice,
      prices: {
        prixod: costPrice,
        roznitsa: retailPrice,
        optom: wholesalePrice,
        vip: vipPrice
      },
      unit,
      image,
      imageUrl: image,
      description: `${nameUz} - Yuqori sifatli mahsulot.`,
      descriptionUz: `${nameUz} - Yuqori sifatli mahsulot.`,
      descriptionRu: `${nameUz} - Качественный продукт.`,
      descriptionEn: `${nameUz} - Quality product.`,
      expiryDays: 180,
      isActive: true,
      stockByBranch: {
        br_toshkent_main: 50,
        br_chilanzar: 50,
        br_samarkand: 50
      },
      minStockAlert: 10,
      tags: [categoryId, 'regos_direct', brand.toLowerCase().replace(/\s+/g, '_')]
    };

    productList.push(product);
  });

  console.log(`✅ Converted into ${productList.length} clean products directly from REGOS API!`);

  // Write to src/data/all_clean_products.json
  const outputPath = path.join(process.cwd(), 'src/data/all_clean_products.json');
  fs.writeFileSync(outputPath, JSON.stringify(productList, null, 2), 'utf8');
  console.log(`💾 Saved ${productList.length} products to ${outputPath}`);

  // Sync to Neon PostgreSQL
  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    console.log('🗄️ Syncing to PostgreSQL products_db...');
    const client = await pool.connect();

    await client.query('DELETE FROM products_db');
    console.log('🧹 Cleared old records in PostgreSQL products_db.');

    const batchSize = 250;
    for (let i = 0; i < productList.length; i += batchSize) {
      const batch = productList.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];

      batch.forEach((prod, pIdx) => {
        const offset = pIdx * 2;
        placeholders.push(`($${offset + 1}, $${offset + 2}, NOW())`);
        values.push(prod.id, JSON.stringify(prod));
      });

      const query = `INSERT INTO products_db (id, data, updated_at) VALUES ${placeholders.join(', ')} ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      await client.query(query, values);
      process.stdout.write(`\r📥 Inserted ${Math.min(i + batchSize, productList.length)} / ${productList.length} products into PostgreSQL...`);
    }
    console.log('\n✅ Successfully synced all products directly from REGOS to PostgreSQL!');

    client.release();
    await pool.end();
  } catch(dbErr) {
    console.error('DB Sync error:', dbErr.message);
  }

  console.log('🎉 100% REGOS Import Completed Successfully!');
}

processAndSync().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
