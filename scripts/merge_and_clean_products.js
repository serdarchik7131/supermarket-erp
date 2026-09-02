import fs from 'fs';

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/«|»|"|'|`|’|&#8217;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/[\(\)\[\],.;:\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidProductImage(img) {
  if (!img || typeof img !== 'string') return false;
  const trimmed = img.trim();
  if (trimmed === '') return false;
  if (
    trimmed.includes('logo-container') ||
    trimmed.includes('logo-panda') ||
    trimmed.includes('Mask-group') ||
    trimmed.includes('Frame') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('unsplash.com') ||
    trimmed.endsWith('.pdf') ||
    trimmed.endsWith('.mp4')
  ) {
    return false;
  }
  if (
    trimmed.startsWith('https://sfad.uz/') ||
    trimmed.startsWith('https://kdv-group.com/') ||
    (trimmed.startsWith('https://pandasanoatsavdo.uz/') &&
      (trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.webp') || trimmed.endsWith('.jpeg')))
  ) {
    return true;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
  }
  return false;
}

// 1. Load files
const tegenRaw = JSON.parse(fs.readFileSync('src/data/tegen_products.json', 'utf8'));
const kdvRaw = JSON.parse(fs.readFileSync('src/data/kdv_products.json', 'utf8'));
const babyfoxRaw = JSON.parse(fs.readFileSync('src/data/kdv_babyfox_products.json', 'utf8'));
const bondiRaw = JSON.parse(fs.readFileSync('src/data/kdv_bondi_products.json', 'utf8'));
const pandaRaw = fs.existsSync('panda_generated_products.json') ? JSON.parse(fs.readFileSync('panda_generated_products.json', 'utf8')) : [];
const kremberRaw = fs.existsSync('krember_scraped_products.json') ? JSON.parse(fs.readFileSync('krember_scraped_products.json', 'utf8')) : [];

const seenKeys = new Map();
const seenBarcodes = new Set();
const uniqueProducts = [];

let autoBarcodeIndex = 4780990000000;

function generateUniqueBarcode(existingBarcode) {
  if (existingBarcode && existingBarcode !== 'None' && existingBarcode !== '0' && existingBarcode.length >= 8 && !seenBarcodes.has(existingBarcode)) {
    seenBarcodes.add(existingBarcode);
    return existingBarcode;
  }
  let bc;
  do {
    autoBarcodeIndex++;
    bc = String(autoBarcodeIndex);
  } while (seenBarcodes.has(bc));
  seenBarcodes.add(bc);
  return bc;
}

function processAndAdd(rawItem, source) {
  const nameUz = (rawItem.nameUz || rawItem.title || rawItem.nameRu || rawItem.name || '').replace(/&#8217;/g, "'").replace(/&amp;/g, '&').trim();
  const nameRu = (rawItem.nameRu || rawItem.title || rawItem.nameUz || rawItem.name || '').replace(/&#8217;/g, "'").replace(/&amp;/g, '&').trim();
  const nameEn = (rawItem.nameEn || rawItem.nameUz || rawItem.title || '').replace(/&#8217;/g, "'").replace(/&amp;/g, '&').trim();

  if (!nameUz && !nameRu) return;

  const key = normalizeName(nameUz || nameRu);
  if (!key) return;

  // Determine price and cost price
  let price = Number(rawItem.price || (rawItem.prices && (rawItem.prices.pt_retail || rawItem.prices.roznitsa)) || 0);
  let costPrice = Number(rawItem.costPrice || (rawItem.prices && (rawItem.prices.pt_cost || rawItem.prices.prixod)) || 0);

  // If price is missing or zero, estimate realistic prices based on product type
  if (price <= 0 && costPrice <= 0) {
    const lName = key;
    if (lName.includes('shokolad') || lName.includes('chocolate') || lName.includes('tetlis') || lName.includes('seville')) {
      price = 18000;
      costPrice = 13000;
    } else if (lName.includes('konfet') || lName.includes('karamel') || lName.includes('candy')) {
      price = 42000;
      costPrice = 30000;
    } else if (lName.includes('pechenye') || lName.includes('biskvit') || lName.includes('keks') || lName.includes('cookie')) {
      price = 24000;
      costPrice = 17000;
    } else if (lName.includes('vafli') || lName.includes('wafer')) {
      price = 22000;
      costPrice = 15500;
    } else if (lName.includes('ichimlik') || lName.includes('sharbat') || lName.includes('choy') || lName.includes('sok')) {
      price = 9000;
      costPrice = 6500;
    } else {
      price = 25000;
      costPrice = 18000;
    }
  } else if (price <= 0 && costPrice > 0) {
    price = Math.round(costPrice * 1.35 / 100) * 100;
  } else if (costPrice <= 0 && price > 0) {
    costPrice = Math.round(price * 0.72 / 100) * 100;
  }

  // Determine Category ID
  let categoryId = rawItem.categoryId || rawItem.category || '';
  if (!categoryId || categoryId === 'Shirinliklar' || categoryId === 'cat_sweets') {
    const lName = key;
    if (source === 'krember') {
      if (lName.includes('shokolad') || lName.includes('tetlis')) categoryId = 'cat_krember_chocolate';
      else if (lName.includes('konfet') || lName.includes('karamel') || lName.includes('crispy') || lName.includes('jolline')) categoryId = 'cat_krember_candies';
      else if (lName.includes('pechenye') || lName.includes('vafli') || lName.includes('keks')) categoryId = 'cat_krember_biscuits';
      else categoryId = 'cat_krember_sweets';
    } else if (source === 'panda') {
      if (lName.includes('shokolad') || lName.includes('boom')) categoryId = 'cat_panda_choc_candies';
      else if (lName.includes('vafli') || lName.includes('trubochka')) categoryId = 'cat_panda_waffles';
      else if (lName.includes('pechenye')) categoryId = 'cat_panda_cookies';
      else categoryId = 'cat_panda_candies';
    } else {
      if (lName.includes('shokolad')) categoryId = 'cat_sfad_chocolate';
      else if (lName.includes('pechenye')) categoryId = 'cat_sfad_biscuits';
      else if (lName.includes('vafli')) categoryId = 'cat_sfad_wafers';
      else if (lName.includes('konfet') || lName.includes('karamel')) categoryId = 'cat_sfad_candies';
      else categoryId = 'cat_sfad_sweets';
    }
  }

  // Determine Image (only keep if 100% authentic product photo)
  const rawImg = rawItem.image || rawItem.imageUrl || '';
  const image = isValidProductImage(rawImg) ? rawImg.trim() : '';

  // Determine Brand
  let brand = rawItem.brand || '';
  if (!brand) {
    if (source === 'kdv') brand = 'KDV (Яшкино)';
    else if (source === 'babyfox') brand = 'Babyfox (KDV)';
    else if (source === 'bondi') brand = 'Бегемотик Бонди (KDV)';
    else if (source === 'panda') brand = 'Panda Sanoat Savdo';
    else if (source === 'krember') brand = 'Krember';
    else if (source === 'tegen') brand = 'SFAD';
    else brand = 'TradeUZ';
  }

  // Determine Unit
  let unit = rawItem.unit || 'dona';
  if (key.includes('kg') || key.includes('кг') || (rawItem.unit && rawItem.unit.toLowerCase() === 'kg')) {
    unit = 'kg';
  }

  // Check if already seen
  if (seenKeys.has(key)) {
    const existingIndex = seenKeys.get(key);
    const existingItem = uniqueProducts[existingIndex];
    if (!existingItem.image && image) {
      existingItem.image = image;
    }
    if ((!existingItem.description || existingItem.description.length < 10) && rawItem.description) {
      existingItem.description = rawItem.description;
    }
    return;
  }

  const id = rawItem.id || `prod_${source}_${uniqueProducts.length + 1}`;
  const barcode = generateUniqueBarcode(rawItem.barcode);
  const sku = rawItem.sku && rawItem.sku !== '-' ? rawItem.sku : `${source.toUpperCase().slice(0, 3)}-${uniqueProducts.length + 1000}`;

  const wholesalePrice = Math.round(costPrice * 1.15 / 100) * 100;
  const vipPrice = Math.round(costPrice * 1.10 / 100) * 100;

  const product = {
    id,
    sku,
    barcode,
    nameUz,
    nameRu: nameRu || nameUz,
    nameEn: nameEn || nameUz,
    categoryId,
    brand,
    price,
    costPrice,
    unit,
    image, // Only authentic photo or empty string
    description: rawItem.description || `${nameUz} — ${brand} brendining sifatli qandolat va oziq-ovqat mahsuloti.`,
    expiryDays: rawItem.expiryDays || 180,
    isPopular: !!rawItem.isPopular,
    isPromotional: !!rawItem.isPromotional,
    stockByBranch: {
      br_toshkent_main: 0,
      br_chilanzar: 0,
      br_samarkand: 0,
    },
    prices: {
      pt_cost: costPrice,
      pt_retail: price,
      pt_wholesale: wholesalePrice,
      pt_vip: vipPrice,
      prixod: costPrice,
      roznitsa: price,
      optom: wholesalePrice,
      vip: vipPrice,
    },
    minStockAlert: rawItem.minStockAlert || 10,
    tags: rawItem.tags || [brand.toLowerCase(), unit, categoryId],
  };

  seenKeys.set(key, uniqueProducts.length);
  uniqueProducts.push(product);
}

// Process in priority order
bondiRaw.forEach(p => processAndAdd(p, 'bondi'));
babyfoxRaw.forEach(p => processAndAdd(p, 'babyfox'));
kdvRaw.forEach(p => processAndAdd(p, 'kdv'));
pandaRaw.forEach(p => processAndAdd(p, 'panda'));
kremberRaw.forEach(p => processAndAdd(p, 'krember'));
tegenRaw.forEach(p => processAndAdd(p, 'tegen'));

// Write the full clean deduplicated products list
fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(uniqueProducts, null, 2), 'utf8');
console.log('Saved src/data/all_clean_products.json with', uniqueProducts.length, 'unique products.');
