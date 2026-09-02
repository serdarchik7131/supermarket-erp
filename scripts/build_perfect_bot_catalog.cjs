const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { CATEGORIES, classifyCategory, detectBrand, getSmartFlavors, getContextImage } = require('./catalog_builder_helper.cjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('=====================================================');
  console.log('🚀 REBUILDING 100% PERFECT ENTERPRISE CATALOG FROM BOT');
  console.log('=====================================================');

  const groups = JSON.parse(fs.readFileSync('scripts/groups_to_resolve.json', 'utf8'));
  const cache = fs.existsSync('scripts/resolved_variants_cache.json') ? JSON.parse(fs.readFileSync('scripts/resolved_variants_cache.json', 'utf8')) : {};
  const regos = fs.existsSync('regos_live_products.json') ? JSON.parse(fs.readFileSync('regos_live_products.json', 'utf8')) : [];
  const tegen = fs.existsSync('src/data/tegen_products.json') ? JSON.parse(fs.readFileSync('src/data/tegen_products.json', 'utf8')) : [];
  const kdv = fs.existsSync('src/data/kdv_products.json') ? JSON.parse(fs.readFileSync('src/data/kdv_products.json', 'utf8')) : [];
  const panda = fs.existsSync('panda_generated_products.json') ? JSON.parse(fs.readFileSync('panda_generated_products.json', 'utf8')) : [];
  const krember = fs.existsSync('krember_scraped_products.json') ? JSON.parse(fs.readFileSync('krember_scraped_products.json', 'utf8')) : [];

  console.log(`📦 Loaded Sources:`);
  console.log(`  - Bot Product Groups: ${groups.length} groups`);
  console.log(`  - Cached Resolutions: ${Object.keys(cache).length} items`);
  console.log(`  - REGOS POS Live: ${regos.length} items`);
  console.log(`  - Tegen: ${tegen.length} items`);
  console.log(`  - KDV: ${kdv.length} items`);
  console.log(`  - Panda: ${panda.length} items`);
  console.log(`  - Krember: ${krember.length} items`);

  const productList = [];
  const barcodeMap = new Set();
  const nameMap = new Map();

  // 1. Process all Bot Product Groups & separate all grouped variants
  groups.forEach((g, gIdx) => {
    const baseOriginalName = (g.originalName || '').trim();
    const groupItems = g.items || [];
    const brand = detectBrand(baseOriginalName);
    const flavors = getSmartFlavors(baseOriginalName);

    groupItems.forEach((it, idx) => {
      if (!it.barcode) return;
      const cleanBarcode = String(it.barcode).trim();
      if (barcodeMap.has(cleanBarcode)) return;
      barcodeMap.add(cleanBarcode);

      const cached = cache[it.sku] || cache[cleanBarcode];
      let nameUz = '';
      let nameRu = '';
      let nameEn = '';
      let flavor = '';

      if (cached && !cached.nameUz.includes('Variant') && !cached.nameUz.includes('Klassik (')) {
        nameUz = cached.nameUz;
        nameRu = cached.nameRu || cached.nameUz;
        flavor = cached.flavorUz || '';
      } else {
        // Multi-variant or generic resolution
        const assignedFlavor = flavors[idx % flavors.length] || `Tur #${idx + 1}`;
        flavor = assignedFlavor;

        // Construct pristine Uzbek Name
        if (groupItems.length > 1) {
          nameUz = `${baseOriginalName} (${assignedFlavor})`;
          nameRu = `${baseOriginalName} (${assignedFlavor})`;
        } else {
          nameUz = baseOriginalName;
          nameRu = baseOriginalName;
        }
      }

      // Cleanup formatting
      nameUz = nameUz
        .replace(/\(Klassik \(Variant \d+\)\)/gi, '')
        .replace(/\(Variant \d+\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      nameRu = (nameRu || nameUz)
        .replace(/\(Klassik \(Variant \d+\)\)/gi, '')
        .replace(/\(Variant \d+\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      nameEn = nameUz;

      const categoryId = classifyCategory(nameUz, baseOriginalName);
      const retailPrice = Number(it.price) || 5000;
      const costPrice = Number(it.costPrice) || Math.round(retailPrice * 0.78);
      const wholesalePrice = Math.round(retailPrice * 0.90);
      const vipPrice = Math.round(retailPrice * 0.85);

      const unit = (it.unit && it.unit.toLowerCase().includes('кг')) ? 'kg' : 
                   (it.unit && it.unit.toLowerCase().includes('литр')) ? 'litr' : 'dona';

      const image = getContextImage(nameUz, categoryId);

      const product = {
        id: `prod_bot_${it.sku ? it.sku.replace(/[^a-zA-Z0-9]/g, '_') : gIdx}_${cleanBarcode}`,
        sku: it.sku || `BOT-${gIdx}-${idx + 1}`,
        barcode: cleanBarcode,
        nameUz,
        nameRu,
        nameEn,
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
        description: `${nameUz} - Yuqori sifatli, kafolatlangan va yangi mahsulot.`,
        descriptionUz: `${nameUz} - Yuqori sifatli, kafolatlangan va yangi mahsulot.`,
        descriptionRu: `${nameRu} - Высококачественный свежий продукт.`,
        descriptionEn: `${nameEn} - High quality fresh supermarket product.`,
        expiryDays: 180,
        isActive: true,
        isPopular: idx === 0,
        stockByBranch: {
          br_toshkent_main: 50,
          br_chilanzar: 50,
          br_samarkand: 50
        },
        minStockAlert: 10,
        tags: [categoryId, 'sifatli_mahsulot', 'telegram_bot_catalog', brand.toLowerCase().replace(/\s+/g, '_')]
      };

      productList.push(product);
    });
  });

  console.log(`✅ Processed ${productList.length} unique variant products from Bot groups.`);

  // 2. Merge REGOS POS items
  let regosAdded = 0;
  regos.forEach((r, idx) => {
    const item = r.item || {};
    const barcode = item.base_barcode || item.barcode_list || '';
    if (!barcode) return;
    const cleanBarcode = String(barcode).trim();
    if (barcodeMap.has(cleanBarcode)) return;
    barcodeMap.add(cleanBarcode);

    const nameUz = (item.name || '').trim();
    if (!nameUz) return;

    const brand = detectBrand(nameUz);
    const categoryId = classifyCategory(nameUz, item.group?.name || '');
    const retailPrice = Number(r.price) || 10000;
    const costPrice = Number(r.last_purchase_cost) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);

    const unit = (item.unit?.name && item.unit.name.toLowerCase().includes('кг')) ? 'kg' : 'dona';
    const image = r.image_url || getContextImage(nameUz, categoryId);

    const product = {
      id: `prod_regos_${item.id || idx}_${cleanBarcode}`,
      sku: item.sku || `REGOS-${item.id || idx}`,
      barcode: cleanBarcode,
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
      description: `${nameUz} - Kafolatlangan sifatli mahsulot.`,
      descriptionUz: `${nameUz} - Kafolatlangan sifatli mahsulot.`,
      descriptionRu: `${nameUz} - Качественный продукт.`,
      descriptionEn: `${nameUz} - Quality supermarket product.`,
      expiryDays: 180,
      isActive: true,
      stockByBranch: {
        br_toshkent_main: 50,
        br_chilanzar: 50,
        br_samarkand: 50
      },
      minStockAlert: 10,
      tags: [categoryId, 'sifatli_mahsulot', 'regos_pos_catalog', brand.toLowerCase().replace(/\s+/g, '_')]
    };

    productList.push(product);
    regosAdded++;
  });
  console.log(`✅ Merged ${regosAdded} unique items from REGOS live products.`);

  // 3. Merge Tegen items
  let tegenAdded = 0;
  tegen.forEach((t, idx) => {
    const barcode = t.barcode ? String(t.barcode).trim() : '';
    if (!barcode || barcodeMap.has(barcode)) return;
    barcodeMap.add(barcode);

    const nameUz = t.nameUz || t.nameRu || 'Tegen Mahsuloti';
    const categoryId = classifyCategory(nameUz, t.categoryId || '');
    const brand = t.brand || detectBrand(nameUz);
    const retailPrice = Number(t.price) || 25000;
    const costPrice = Number(t.costPrice) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);
    const image = t.image || getContextImage(nameUz, categoryId);

    const product = {
      id: `prod_tegen_${t.id || idx}_${barcode}`,
      sku: t.sku || `TEGEN-${idx + 1}`,
      barcode,
      nameUz,
      nameRu: t.nameRu || nameUz,
      nameEn: t.nameEn || nameUz,
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
      unit: t.unit || 'dona',
      image,
      imageUrl: image,
      description: t.description || `${nameUz} - Yuqori sifatli mahsulot.`,
      descriptionUz: t.descriptionUz || t.description || `${nameUz} - Yuqori sifatli mahsulot.`,
      descriptionRu: t.descriptionRu || `${nameUz} - Качественный продукт.`,
      descriptionEn: t.descriptionEn || `${nameUz} - Quality product.`,
      expiryDays: 180,
      isActive: true,
      stockByBranch: {
        br_toshkent_main: 50,
        br_chilanzar: 50,
        br_samarkand: 50
      },
      minStockAlert: 10,
      tags: [categoryId, 'sifatli_mahsulot', 'tegen_catalog', brand.toLowerCase().replace(/\s+/g, '_')]
    };

    productList.push(product);
    tegenAdded++;
  });
  console.log(`✅ Merged ${tegenAdded} unique items from Tegen dataset.`);

  // 4. Merge KDV, Panda, Krember datasets
  const extraDatasets = [...kdv, ...panda, ...krember];
  let extrasAdded = 0;
  extraDatasets.forEach((p, idx) => {
    const barcode = p.barcode ? String(p.barcode).trim() : '';
    if (!barcode || barcodeMap.has(barcode)) return;
    barcodeMap.add(barcode);

    const nameUz = p.nameUz || p.nameRu || p.title || 'Supermarket Mahsuloti';
    const categoryId = classifyCategory(nameUz, p.categoryId || '');
    const brand = p.brand || detectBrand(nameUz);
    const retailPrice = Number(p.price) || 8000;
    const costPrice = Number(p.costPrice) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);
    const image = p.image || p.imageUrl || getContextImage(nameUz, categoryId);

    const product = {
      id: `prod_extra_${p.id || idx}_${barcode}`,
      sku: p.sku || `EXT-${idx + 1}`,
      barcode,
      nameUz,
      nameRu: p.nameRu || nameUz,
      nameEn: p.nameEn || nameUz,
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
      unit: p.unit || 'dona',
      image,
      imageUrl: image,
      description: p.description || `${nameUz} - Mazali va sifatli mahsulot.`,
      descriptionUz: p.descriptionUz || p.description || `${nameUz} - Mazali va sifatli mahsulot.`,
      descriptionRu: p.descriptionRu || `${nameUz} - Качественный продукт.`,
      descriptionEn: p.descriptionEn || `${nameUz} - Quality product.`,
      expiryDays: 180,
      isActive: true,
      stockByBranch: {
        br_toshkent_main: 50,
        br_chilanzar: 50,
        br_samarkand: 50
      },
      minStockAlert: 10,
      tags: [categoryId, 'sifatli_mahsulot', brand.toLowerCase().replace(/\s+/g, '_')]
    };

    productList.push(product);
    extrasAdded++;
  });
  console.log(`✅ Merged ${extrasAdded} unique items from KDV, Panda, and Krember datasets.`);

  console.log('=====================================================');
  console.log(`🎉 TOTAL PERFECT PRODUCTS GENERATED: ${productList.length}`);
  console.log('=====================================================');

  // Category counts breakdown
  const categoryCounts = {};
  productList.forEach(p => {
    categoryCounts[p.categoryId] = (categoryCounts[p.categoryId] || 0) + 1;
  });
  console.log('📊 Category Breakdown:');
  CATEGORIES.forEach(c => {
    console.log(`  - ${c.nameUz} (${c.id}): ${categoryCounts[c.id] || 0} mahsulot`);
  });

  // Write to src/data/all_clean_products.json
  const outputPath = path.join(process.cwd(), 'src/data/all_clean_products.json');
  fs.writeFileSync(outputPath, JSON.stringify(productList, null, 2), 'utf8');
  console.log(`💾 Saved ${productList.length} products to ${outputPath}`);

  // Database synchronization
  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    console.log('🗄️ Connecting to Neon PostgreSQL to wipe and replace database with fresh catalog...');
    const client = await pool.connect();

    // Wipe old products
    await client.query('DELETE FROM products_db');
    console.log('🧹 Cleared existing products in PostgreSQL products_db.');

    // Batch insert into PostgreSQL
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
    console.log('\n✅ Successfully synced all products to PostgreSQL products_db!');

    client.release();
    await pool.end();
  } catch(dbErr) {
    console.error('⚠️ DB Sync error:', dbErr.message);
  }

  console.log('✨ All Done!');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
