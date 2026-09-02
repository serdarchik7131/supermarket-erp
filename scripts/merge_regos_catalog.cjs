const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Helper image resolver based on category and title keywords
function getSmartImage(title, categoryId) {
  const t = (title || '').toLowerCase();
  if (t.includes('coca') || t.includes('pepsi') || t.includes('fanta') || t.includes('sprite') || t.includes('cola')) {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('suv') || t.includes('water') || t.includes('zam zam') || t.includes('nestle') || t.includes('hydrolife')) {
    return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('sok') || t.includes('juice') || t.includes('sharbat') || t.includes('viko') || t.includes('bliss') || t.includes('dena')) {
    return 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('choy') || t.includes('tea') || t.includes('tess') || t.includes('greenfield') || t.includes('lipton')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('kofe') || t.includes('coffee') || t.includes('nescafe') || t.includes('maccoffee') || t.includes('jacobs')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('shokolad') || t.includes('chocolate') || t.includes('alpen') || t.includes('snickers') || t.includes('mars') || t.includes('kitkat') || t.includes('milka') || t.includes('kinder')) {
    return 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('pechen') || t.includes('cookie') || t.includes('oreo') || t.includes('yashkino') || t.includes('krember') || t.includes('bondi') || t.includes('biskvit')) {
    return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('vafli') || t.includes('wafer') || t.includes('trubochka')) {
    return 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('chips') || t.includes('lays') || t.includes('kreshki') || t.includes('snek') || t.includes('pringle')) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('sut') || t.includes('milk') || t.includes('musaffo') || t.includes('nestle') || t.includes('lactel') || t.includes('malako') || t.includes('kefir') || t.includes('qatiq')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('pishloq') || t.includes('cheese') || t.includes('syr') || t.includes('tvorog') || t.includes('brinza')) {
    return 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('yog') || t.includes('maslo') || t.includes('oil') || t.includes('saryog') || t.includes('sloboda') || t.includes('shedevr') || t.includes('avedov')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('un') || t.includes('muka') || t.includes('flour') || t.includes('don') || t.includes('makaron') || t.includes('pasta') || t.includes('guruch') || t.includes('rice')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('gosht') || t.includes('meat') || t.includes('mol') || t.includes('qo\'y') || t.includes('tovuq') || t.includes('chicken') || t.includes('kolbasa') || t.includes('sosiska')) {
    return 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('olma') || t.includes('banan') || t.includes('apelsin') || t.includes('meva') || t.includes('pomidor') || t.includes('bodring') || t.includes('sabzi') || t.includes('kartoshka')) {
    return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('shampun') || t.includes('shampoo') || t.includes('sovun') || t.includes('soap') || t.includes('krem') || t.includes('parfum') || t.includes('atir') || t.includes('dush')) {
    return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('poroshok') || t.includes('ariel') || t.includes('tide') || t.includes('persil') || t.includes('fairy') || t.includes('tozalash') || t.includes('domestos')) {
    return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('daftar') || t.includes('ruchka') || t.includes('qalam') || t.includes('kitob') || t.includes('qogoz') || t.includes('pen') || t.includes('pencil')) {
    return 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80';
  }

  // Category fallbacks
  switch (categoryId) {
    case 'cat_drinks':
      return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80';
    case 'cat_dairy':
      return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80';
    case 'cat_fruits':
      return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80';
    case 'cat_bakery':
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80';
    case 'cat_grocery':
      return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
    case 'cat_snacks':
      return 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=600&q=80';
    case 'cat_hygiene':
      return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80';
    case 'cat_stationery':
      return 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80';
    case 'cat_baby':
      return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80';
    default:
      return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
  }
}

function mapCategory(groupName, itemName) {
  const g = (groupName || '').toUpperCase();
  const t = (itemName || '').toLowerCase();

  if (g.includes('SUV') || g.includes('CHOY') || t.includes('suv') || t.includes('sok') || t.includes('choy') || t.includes('kofe') || t.includes('ichimlik') || t.includes('pepsi') || t.includes('coca')) {
    return 'cat_drinks';
  }
  if (g.includes('SUT') || g.includes('MALAKO') || g.includes('GOSHT') || g.includes('KOLBASA') || t.includes('sut') || t.includes('qatiq') || t.includes('pishloq') || t.includes('tvorog') || t.includes('kolbasa') || t.includes('gosht')) {
    return 'cat_dairy';
  }
  if (g.includes('MEVA') || g.includes('SABZAVOT') || t.includes('olma') || t.includes('banan') || t.includes('pomidor') || t.includes('kartoshka') || t.includes('meva')) {
    return 'cat_fruits';
  }
  if (g.includes('PECHINNI') || g.includes('PISHIRIQ') || g.includes('NON') || t.includes('pechenye') || t.includes('biskvit') || t.includes('non') || t.includes('keks') || t.includes('tort')) {
    return 'cat_bakery';
  }
  if (g.includes('SHOKOLAD') || g.includes('CHIPS') || g.includes('KRESHKI') || t.includes('shokolad') || t.includes('konfet') || t.includes('chips') || t.includes('snek') || t.includes('vafli')) {
    return 'cat_snacks';
  }
  if (g.includes('UN') || g.includes('YOG') || g.includes('MAKARON') || g.includes('KONSERVA') || g.includes('DUKKAKLI') || t.includes('un') || t.includes('yog') || t.includes('guruch') || t.includes('makaron') || t.includes('shakar') || t.includes('tuz')) {
    return 'cat_grocery';
  }
  if (g.includes('PARFUM') || g.includes('KOSMETIKA') || g.includes('GIGI') || t.includes('shampun') || t.includes('sovun') || t.includes('poroshok') || t.includes('tish') || t.includes('krem') || t.includes('parfum') || t.includes('gel')) {
    return 'cat_hygiene';
  }
  if (g.includes('KANSILARIYA') || g.includes('KANTS') || t.includes('daftar') || t.includes('ruchka') || t.includes('qalam') || t.includes('kitob')) {
    return 'cat_stationery';
  }
  if (g.includes('BOLA') || t.includes('pampers') || t.includes('taglik') || t.includes('pyure') || t.includes('baby')) {
    return 'cat_baby';
  }
  return 'cat_grocery';
}

function cleanTitle(s) {
  if (!s) return 'Supermarket Mahsuloti';
  return s.trim().replace(/\s+/g, ' ');
}

function normalizeKey(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9а-яёўқғҳ]/gi, '').trim();
}

async function main() {
  console.log('📦 Starting Regos live catalog merge & deduplication...');

  const regosRaw = JSON.parse(fs.readFileSync('regos_live_products.json', 'utf8'));
  const existingPath = path.join(__dirname, '../src/data/all_clean_products.json');
  let existingProducts = [];
  if (fs.existsSync(existingPath)) {
    try {
      existingProducts = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    } catch (e) {
      console.warn('Error reading existing products:', e.message);
    }
  }

  console.log(`Loaded ${regosRaw.length} live Regos items and ${existingProducts.length} existing products.`);

  // Barcode map and Name map for deduplication
  const barcodeToProduct = new Map();
  const nameToProduct = new Map();
  const skuToProduct = new Map();

  // First, index existing products
  const finalProducts = [];

  for (const p of existingProducts) {
    const product = { ...p };
    finalProducts.push(product);
    if (product.barcode) barcodeToProduct.set(product.barcode.trim(), product);
    if (product.sku) skuToProduct.set(String(product.sku).trim(), product);
    if (product.nameUz) nameToProduct.set(normalizeKey(product.nameUz), product);
    if (product.nameRu) nameToProduct.set(normalizeKey(product.nameRu), product);
  }

  let updatedPriceCount = 0;
  let addedRegosCount = 0;
  let skippedDuplicatesCount = 0;

  for (const regosEntry of regosRaw) {
    const it = regosEntry.item;
    if (!it) continue;

    const rawBarcodes = (it.barcode_list || it.base_barcode || '').split(',').map((b) => b.trim()).filter(Boolean);
    const mainBarcode = rawBarcodes[0] || (it.code ? `4780${String(it.code).padStart(9, '0')}` : `REG-${it.id}`);
    const regosPrice = Number(regosEntry.price) || 0;
    const rawStock = Number(regosEntry.quantity?.common || regosEntry.quantity?.allowed || 0);
    const costPrice = Number(regosEntry.last_purchase_cost) || Math.round(regosPrice * 0.78) || Math.round(regosPrice * 0.7);

    const groupName = it.group?.name || it.group?.path || '';
    const catId = mapCategory(groupName, it.name);

    const normName = normalizeKey(it.name);

    // Check if this item matches an existing product
    let matched = null;

    for (const b of rawBarcodes) {
      if (barcodeToProduct.has(b)) {
        matched = barcodeToProduct.get(b);
        break;
      }
    }

    if (!matched && it.code && skuToProduct.has(String(it.code))) {
      matched = skuToProduct.get(String(it.code));
    }

    if (!matched && normName && nameToProduct.has(normName)) {
      matched = nameToProduct.get(normName);
    }

    if (matched) {
      // UPDATE EXISTING PRODUCT WITH REGOS PRICE AND DATA (NO DUPLICATE!)
      if (regosPrice > 0) {
        matched.price = regosPrice;
        matched.costPrice = costPrice;
        matched.prices = {
          prixod: costPrice,
          roznitsa: regosPrice,
          optom: Math.round(regosPrice * 0.9),
          vip: Math.round(regosPrice * 0.85),
        };
        updatedPriceCount++;
      }
      if (mainBarcode && !matched.barcode) matched.barcode = mainBarcode;
      if (rawStock > 0) {
        matched.stockByBranch = {
          br_toshkent_main: Math.ceil(rawStock * 0.5) || 15,
          br_chilanzar: Math.ceil(rawStock * 0.3) || 10,
          br_samarkand: Math.ceil(rawStock * 0.2) || 5,
        };
      }
      skippedDuplicatesCount++;
    } else {
      // CREATE NEW PRODUCT ENTRY FROM REGOS
      const cleanedTitle = cleanTitle(it.name);
      const effectivePrice = regosPrice > 0 ? regosPrice : 15000;
      const effectiveCost = costPrice > 0 ? costPrice : Math.round(effectivePrice * 0.78);

      const unitName = it.unit?.name || 'шт';
      let unit = 'dona';
      if (unitName.includes('кг') || unitName.includes('kg')) unit = 'kg';
      else if (unitName.includes('л') || unitName.includes('литр')) unit = 'litr';

      const newProduct = {
        id: `regos_${it.id}`,
        sku: it.code ? String(it.code) : `REG-${it.id}`,
        barcode: mainBarcode,
        nameUz: cleanedTitle,
        nameRu: cleanedTitle,
        nameEn: cleanedTitle,
        categoryId: catId,
        brand: it.brand || it.producer || (groupName ? groupName.split(' ')[0] : 'Regos Savdo'),
        price: effectivePrice,
        costPrice: effectiveCost,
        prices: {
          prixod: effectiveCost,
          roznitsa: effectivePrice,
          optom: Math.round(effectivePrice * 0.9),
          vip: Math.round(effectivePrice * 0.85),
        },
        unit: unit,
        image: getSmartImage(cleanedTitle, catId),
        description: `${cleanedTitle}. Regos.online savdo tizimidan sinxronlashtirilgan original mahsulot.`,
        descriptionUz: `${cleanedTitle}. Regos savdo tizimidan rasmiy mahsulot.`,
        descriptionRu: `${cleanedTitle}. Официальный товар из системы Regos.online.`,
        descriptionEn: `${cleanedTitle}. Official product synced from Regos.online.`,
        minQuantity: 1,
        expiryDays: 180,
        isPopular: rawStock > 20,
        isPromotional: false,
        stockByBranch: {
          br_toshkent_main: rawStock > 0 ? Math.ceil(rawStock * 0.5) : 25,
          br_chilanzar: rawStock > 0 ? Math.ceil(rawStock * 0.3) : 15,
          br_samarkand: rawStock > 0 ? Math.ceil(rawStock * 0.2) : 10,
        },
        minStockAlert: 5,
        tags: [catId, 'regos', 'savdo', ...cleanedTitle.toLowerCase().split(' ')].filter((t) => t.length > 2),
      };

      finalProducts.push(newProduct);
      addedRegosCount++;

      // Register into maps to prevent any duplicate among subsequent Regos items
      if (mainBarcode) barcodeToProduct.set(mainBarcode, newProduct);
      rawBarcodes.forEach((b) => barcodeToProduct.set(b, newProduct));
      if (it.code) skuToProduct.set(String(it.code), newProduct);
      if (normName) nameToProduct.set(normName, newProduct);
    }
  }

  console.log(`\n📊 MERGE STATS:`);
  console.log(`- Updated prices on existing products: ${updatedPriceCount}`);
  console.log(`- New unique Regos products added: ${addedRegosCount}`);
  console.log(`- Deduplicated/matched items: ${skippedDuplicatesCount}`);
  console.log(`- Total unique catalog items: ${finalProducts.length}`);

  // Write back to all_clean_products.json
  fs.writeFileSync(existingPath, JSON.stringify(finalProducts, null, 2));
  console.log(`✅ Written ${finalProducts.length} items to src/data/all_clean_products.json`);

  // Also sync to PostgreSQL database
  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });

    console.log('🔄 Connecting to Neon PostgreSQL to batch sync products_db...');
    const client = await pool.connect();

    // Create table if needed
    await client.query(`
      CREATE TABLE IF NOT EXISTS products_db (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert/Update in batches of 200
    const batchSize = 200;
    for (let i = 0; i < finalProducts.length; i += batchSize) {
      const batch = finalProducts.slice(i, i + batchSize);
      for (const p of batch) {
        await client.query(
          `INSERT INTO products_db (id, data, updated_at) VALUES ($1, $2, NOW()) 
           ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
          [p.id, JSON.stringify(p)]
        );
      }
      process.stdout.write(`\rProgress: ${Math.min(i + batchSize, finalProducts.length)} / ${finalProducts.length}`);
    }

    client.release();
    await pool.end();
    console.log('\n✅ Successfully synced all products to PostgreSQL Neon DB!');
  } catch (dbErr) {
    console.error('Database sync warning (local fallback ready):', dbErr.message);
  }
}

main().catch(console.error);
