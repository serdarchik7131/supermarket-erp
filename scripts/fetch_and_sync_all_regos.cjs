const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { CATEGORIES, classifyCategory, detectBrand, getContextImage } = require('./catalog_builder_helper.cjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
const REGOS_URL = 'https://integration.regos.uz/gateway/out/6d9d2188297c45f193449a7fc7a0e8a1/v1/Item/GetExt';

async function fetchAndIncludeAll() {
  console.log('🚀 Downloading full 100% REGOS inventory...');
  
  let rawItems = [];
  if (fs.existsSync('regos_raw_all.json')) {
    rawItems = JSON.parse(fs.readFileSync('regos_raw_all.json', 'utf8'));
  } else {
    let offset = 0;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(REGOS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ limit, offset })
      });
      const data = await res.json();
      if (!data.ok || !data.result || data.result.length === 0) break;
      rawItems = rawItems.concat(data.result);
      if (data.next_offset !== undefined && data.next_offset !== null && data.next_offset > offset) {
        offset = data.next_offset;
      } else {
        offset += data.result.length;
      }
      if (data.result.length < limit || (data.total && rawItems.length >= data.total)) hasMore = false;
    }
  }

  console.log(`📦 Loaded ${rawItems.length} total items from REGOS.`);

  const productList = [];
  const barcodeMap = new Set();
  const idMap = new Set();

  rawItems.forEach((r, idx) => {
    const item = r.item || {};
    const nameUz = (item.name || '').trim();
    if (!nameUz) return;

    // Barcode extraction or generation for weight/unbarcoded items
    let barcode = (item.base_barcode || item.barcode_list || '').trim();
    if (barcode) {
      barcode = barcode.split(/[\s,]+/)[0].trim();
    }
    
    // If no barcode (like fruits, vegetables, kg items), generate unique standard 13-digit EAN style
    if (!barcode) {
      const paddedId = String(item.id || idx + 1).padStart(7, '0');
      barcode = `200000${paddedId}`; // Standard in-store PLU / weight barcode prefix
    }

    // Ensure barcode uniqueness
    if (barcodeMap.has(barcode)) {
      barcode = `${barcode}_${item.id || idx + 1}`;
    }
    barcodeMap.add(barcode);

    const groupName = item.group?.name || '';
    const categoryId = classifyCategory(nameUz, groupName);
    const brand = detectBrand(nameUz);

    const retailPrice = Number(r.price) || 5000;
    const costPrice = Number(r.last_purchase_cost) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);

    const unit = (item.unit?.name && item.unit.name.toLowerCase().includes('кг')) ? 'kg' : 
                 (item.unit?.name && item.unit.name.toLowerCase().includes('литр')) ? 'litr' : 'dona';

    const image = item.image_url || r.image_url || getContextImage(nameUz, categoryId);

    const product = {
      id: `prod_regos_${item.id || idx + 1}`,
      sku: item.sku || `REGOS-${item.id || idx + 1}`,
      barcode,
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
      description: `${nameUz} - Kafolatlangan yuqori sifatli mahsulot.`,
      descriptionUz: `${nameUz} - Kafolatlangan yuqori sifatli mahsulot.`,
      descriptionRu: `${nameUz} - Высококачественный проверенный товар.`,
      descriptionEn: `${nameUz} - Quality guaranteed supermarket item.`,
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

  console.log(`========================================================`);
  console.log(`🎉 100% REGOS INVENTORY CONVERTED: ${productList.length} PRODUCTS`);
  console.log(`========================================================`);

  const categoryCounts = {};
  productList.forEach(p => {
    categoryCounts[p.categoryId] = (categoryCounts[p.categoryId] || 0) + 1;
  });
  console.log('📊 Category Breakdown:');
  CATEGORIES.forEach(c => {
    console.log(`  - ${c.nameUz} (${c.id}): ${categoryCounts[c.id] || 0} ta mahsulot`);
  });

  // Save to src/data/all_clean_products.json
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
    console.log('\n✅ Successfully synced 100% REGOS products to PostgreSQL database!');

    client.release();
    await pool.end();
  } catch(dbErr) {
    console.error('DB Sync error:', dbErr.message);
  }

  console.log('✨ All Done!');
}

fetchAndIncludeAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
