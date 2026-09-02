const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { CATEGORIES, classifyCategory, detectBrand, getContextImage } = require('./catalog_builder_helper.cjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Fast dummy filter
function isDummyName(n) {
  if (!n) return true;
  const s = n.trim().toLowerCase();
  if (/^0+[\.\,0]*$/.test(s)) return true;
  if (/^[\.\,\-\_\s\*\#\?\!\:\;]+$/.test(s)) return true;
  if (/^\d{1,2}\.?$/.test(s)) return true;
  if (/^(nomi|nom|tovar|tovar nomi|mahsulot nomi|name|product)$/i.test(s)) return true;
  if (/^(yoq|yo|yo'q|yo`q|y9o|yl|yok|net|netu)$/i.test(s)) return true;
  if (/^(x+|v+|b|m|c|aa|zz|q|w|y|z|k|j|p|s|t|l|n|r|g|d)$/i.test(s)) return true;
  if (/^0\.\s*$/.test(s)) return true;
  if (s === '0' || s === '.' || s === '..' || s === '...' || s === '-') return true;
  return false;
}

async function rebuildFullCatalog() {
  console.log('🚀 Barcha tovarlarni alohida shtrix-kodlar boyicha unpacking qilish boshlandi...');

  const rawPath = path.join(process.cwd(), 'regos_raw_all.json');
  const cachePath = path.join(process.cwd(), 'scripts/resolved_variants_cache.json');

  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};

  // Build clean O(1) lookup map from resolved variants cache
  const cacheByBarcode = new Map();
  const cacheBySku = new Map();
  for (const [k, v] of Object.entries(cache)) {
    if (!v || !v.nameUz) continue;
    const n = v.nameUz.trim();
    if (
      isDummyName(n) ||
      n.includes('Variant') ||
      n.includes('1-turi') ||
      n.includes('2-turi') ||
      n.includes('3-turi') ||
      n.includes('4-turi') ||
      n.includes('5-turi') ||
      n.includes('Turi ') ||
      n.includes('(Klassik') ||
      n.includes('(Olma)') ||
      n.includes('(olma)') ||
      n.includes('nomi')
    ) {
      continue;
    }
    if (v.barcode) cacheByBarcode.set(v.barcode.trim(), v);
    if (v.sku) cacheBySku.set(v.sku.trim(), v);
  }

  const finalProducts = [];
  const seenBarcodes = new Set();
  const seenProductKeys = new Map();

  let skippedZeroPrice = 0;
  let skippedDummyName = 0;
  let consolidatedDuplicates = 0;

  // 1. Unpack and Deduplicate REGOS
  raw.forEach((r, rIdx) => {
    const item = r.item || {};
    const rawName = (item.name || '').trim();
    const retailPrice = Number(r.price) || 0;

    // Filter 1: Price must be > 0
    if (retailPrice <= 0) {
      skippedZeroPrice++;
      return;
    }

    // Filter 2: Name must not be dummy/0/dot
    if (!rawName || isDummyName(rawName)) {
      skippedDummyName++;
      return;
    }

    const realItemId = item.id || rIdx + 1;
    const bcStr = (item.barcode_list || item.base_barcode || '').trim();
    const barcodes = bcStr ? bcStr.split(/[\s,;]+/).filter(b => b.trim().length > 0) : ['200000' + String(realItemId).padStart(7, '0')];

    const groupName = item.group?.name || '';
    const baseCategory = classifyCategory(rawName, groupName);
    const baseBrand = detectBrand(rawName);

    const costPrice = Number(r.last_purchase_cost) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);

    const unit = (item.unit?.name && item.unit.name.toLowerCase().includes('кг')) ? 'kg' : 
                 (item.unit?.name && item.unit.name.toLowerCase().includes('литр')) ? 'litr' : 'dona';

    const stockQty = Number(r.quantity?.common) || 50;

    // Group barcodes under this item by their resolved unique name
    const nameGroups = new Map();

    barcodes.forEach((bc, idx) => {
      let uniqueBc = bc.trim();
      if (!uniqueBc || seenBarcodes.has(uniqueBc)) return;

      let nameUz = rawName;
      let brand = baseBrand;
      let categoryId = baseCategory;
      let desc = `${rawName} - Yuqori sifatli saralangan mahsulot.`;

      const cached = cacheByBarcode.get(uniqueBc) || cacheBySku.get(`${realItemId}-${idx + 1}`);
      if (cached) {
        if (cached.nameUz && !isDummyName(cached.nameUz)) nameUz = cached.nameUz;
        if (cached.brand) brand = cached.brand;
        if (cached.category) categoryId = classifyCategory(nameUz, cached.category);
        if (cached.descriptionUz) desc = cached.descriptionUz;
      }

      let nameRu = cached?.nameRu || nameUz;
      let nameEn = nameUz;

      const normKey = nameUz.trim().toLowerCase();
      if (!nameGroups.has(normKey)) {
        nameGroups.set(normKey, {
          nameUz,
          nameRu,
          nameEn,
          brand,
          categoryId,
          desc,
          primaryBarcode: uniqueBc,
          allBarcodes: [uniqueBc],
          sku: item.sku ? (barcodes.length > 1 ? `${item.sku}-${idx + 1}` : item.sku) : `REGOS-${realItemId}${barcodes.length > 1 ? '-' + (idx + 1) : ''}`,
          itemIdx: idx + 1
        });
      } else {
        // Consolidate identical name into single product! No duplicate cards!
        nameGroups.get(normKey).allBarcodes.push(uniqueBc);
        consolidatedDuplicates++;
      }
    });

    nameGroups.forEach((v) => {
      v.allBarcodes.forEach(b => seenBarcodes.add(b));

      const prodKey = `${v.nameUz.trim().toLowerCase()}___${v.brand.toLowerCase()}`;
      if (seenProductKeys.has(prodKey)) {
        // Merge barcodes into already existing product card
        const existing = seenProductKeys.get(prodKey);
        v.allBarcodes.forEach(b => {
          if (!existing.barcodes.includes(b)) existing.barcodes.push(b);
        });
        consolidatedDuplicates++;
        return;
      }

      const prodId = barcodes.length > 1 ? `prod_regos_${realItemId}_${v.itemIdx}` : `prod_regos_${realItemId}`;
      const product = {
        id: prodId,
        sku: v.sku,
        barcode: v.primaryBarcode,
        barcodes: v.allBarcodes,
        nameUz: v.nameUz,
        nameRu: v.nameRu,
        nameEn: v.nameEn,
        categoryId: v.categoryId,
        brand: v.brand,
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
        image: '',
        imageUrl: '',
        description: v.desc,
        descriptionUz: v.desc,
        descriptionRu: `${v.nameRu} - Качественный проверенный товар.`,
        descriptionEn: `${v.nameUz} - Quality supermarket product.`,
        expiryDays: 180,
        isActive: true,
        stockByBranch: {
          br_toshkent_main: stockQty,
          br_chilanzar: Math.max(0, Math.floor(stockQty * 0.4)),
          br_samarkand: Math.max(0, Math.floor(stockQty * 0.2))
        },
        minStockAlert: 10,
        tags: [v.categoryId, 'regos_unpacked', v.brand.toLowerCase().replace(/\s+/g, '_')]
      };

      seenProductKeys.set(prodKey, product);
      finalProducts.push(product);
    });
  });

  console.log(`📦 Unpacked REGOS: ${finalProducts.length} ta toza, takrorlanmagan mahsulot.`);
  console.log(`   - Narxi 0 bo'lgan o'chirilganlar: ${skippedZeroPrice}`);
  console.log(`   - Nomi '0' yoki '.' bo'lgan o'chirilganlar: ${skippedDummyName}`);
  console.log(`   - Bitta nomga birlashtirilgan dublikat shtrix-kodlar: ${consolidatedDuplicates}`);

  console.log(`================================================================`);
  console.log(`🎉 JAMI REGOS TOVARLARI (FAQAT REGOS): ${finalProducts.length} TA`);
  console.log(`================================================================`);

  // Write to src/data/all_clean_products.json
  const outJson = path.join(process.cwd(), 'src/data/all_clean_products.json');
  fs.writeFileSync(outJson, JSON.stringify(finalProducts, null, 2), 'utf8');
  console.log(`💾 JSON faylga saqlandi: ${outJson}`);

  // Sync to PostgreSQL database
  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    console.log('🗄️ PostgreSQL products_db tozalanmoqda...');
    await client.query('DELETE FROM products_db');
    console.log('🧹 Eski yozuvlar tozalandi.');

    const batchSize = 250;
    for (let i = 0; i < finalProducts.length; i += batchSize) {
      const batch = finalProducts.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];

      batch.forEach((prod, pIdx) => {
        const offset = pIdx * 2;
        placeholders.push(`($${offset + 1}, $${offset + 2}, NOW())`);
        values.push(prod.id, JSON.stringify(prod));
      });

      const query = `INSERT INTO products_db (id, data, updated_at) VALUES ${placeholders.join(', ')} ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      await client.query(query, values);
      process.stdout.write(`\r📥 PostgreSQL-ga yozildi: ${Math.min(i + batchSize, finalProducts.length)} / ${finalProducts.length} ta...`);
    }

    console.log('\n✅ Barcha mahsulotlar PostgreSQL bazasiga 100% muvaffaqiyatli sinxronlandi!');
    client.release();
    await pool.end();
  } catch (dbErr) {
    console.error('PostgreSQL xatosi:', dbErr.message);
  }

  console.log('✨ 100% Jarayon yakunlandi!');
}

rebuildFullCatalog().catch(err => {
  console.error('Xatolik:', err);
  process.exit(1);
});
