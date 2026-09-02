import { Product, Category } from '../types';

export interface RegosParsedItem {
  nameUz: string;
  nameRu?: string;
  sku?: string;
  barcode?: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  vipPrice?: number;
  categoryName?: string;
  categoryId?: string;
  brand?: string;
  unit?: 'kg' | 'dona' | 'litr' | 'quti' | 'pachka';
  stock?: number;
  image?: string;
  description?: string;
  raw?: any;
}

/**
 * Normalizes string for key comparison
 */
function cleanKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9а-яёўқғҳ]/gi, '');
}

/**
 * Cleans numerical string into valid float/integer
 */
export function cleanNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const str = String(val).replace(/[^0-9.-]/g, '').replace(/,/g, '.');
  const num = parseFloat(str);
  return isNaN(num) ? fallback : Math.round(num);
}

/**
 * Maps arbitrary category name from Regos to internal Category ID
 */
export function matchCategoryId(catName: string, categories: Category[]): string {
  if (!catName) return 'cat_grocery';
  const clean = catName.toLowerCase();

  // 1. Direct match with existing category IDs or names
  const direct = categories.find(
    (c) =>
      c.id === catName ||
      c.nameUz.toLowerCase().includes(clean) ||
      c.nameRu.toLowerCase().includes(clean) ||
      clean.includes(c.nameUz.toLowerCase())
  );
  if (direct) return direct.id;

  // 2. Keyword heuristic mapping
  if (clean.includes('pechen') || clean.includes('biskvit') || clean.includes('cooki')) return 'cat_kdv_biscuits';
  if (clean.includes('shokolad') || clean.includes('choc') || clean.includes('baton')) return 'cat_bf_chocolate';
  if (clean.includes('konfet') || clean.includes('cand') || clean.includes('karamel')) return 'cat_sfad_candies';
  if (clean.includes('vafli') || clean.includes('wafer')) return 'cat_kdv_waffles';
  if (clean.includes('ichimlik') || clean.includes('sok') || clean.includes('sharbat') || clean.includes('suv') || clean.includes('choy') || clean.includes('drink') || clean.includes('cola')) return 'cat_drinks';
  if (clean.includes('sut') || clean.includes('qatiq') || clean.includes('pishloq') || clean.includes('tvorog') || clean.includes('dairy') || clean.includes('milk')) return 'cat_dairy';
  if (clean.includes('meva') || clean.includes('sabzavot') || clean.includes('fruit') || clean.includes('olma')) return 'cat_fruits';
  if (clean.includes('non') || clean.includes('tort') || clean.includes('keks') || clean.includes('bulo') || clean.includes('bakery')) return 'cat_bakery';
  if (clean.includes('kiyim') || clean.includes('futbolka') || clean.includes('shim') || clean.includes('apparel')) return 'cat_apparel';
  if (clean.includes('kans') || clean.includes('daftar') || clean.includes('ruchka') || clean.includes('stationery')) return 'cat_stationery';
  if (clean.includes('gigiyena') || clean.includes('sovun') || clean.includes('shampun') || clean.includes('poroshok') || clean.includes('hygiene')) return 'cat_hygiene';
  if (clean.includes('bola') || clean.includes('pyure') || clean.includes('pampers') || clean.includes('baby')) return 'cat_baby';
  if (clean.includes('snek') || clean.includes('chips') || clean.includes('qotirilgan') || clean.includes('snack')) return 'cat_snacks';

  return 'cat_grocery';
}

/**
 * Normalizes Unit
 */
export function normalizeUnit(rawUnit: string): 'kg' | 'dona' | 'litr' | 'quti' | 'pachka' {
  if (!rawUnit) return 'dona';
  const u = rawUnit.toLowerCase().trim();
  if (u.includes('kg') || u.includes('кг') || u.includes('kilogram') || u.includes('килограмм')) return 'kg';
  if (u.includes('litr') || u.includes('литр') || u.includes('л') || u.includes('l')) return 'litr';
  if (u.includes('quti') || u.includes('короб') || u.includes('кор') || u.includes('box')) return 'quti';
  if (u.includes('pachka') || u.includes('пач') || u.includes('упак') || u.includes('pack')) return 'pachka';
  return 'dona';
}

/**
 * Parses Regos Object / JSON Record into RegosParsedItem
 */
export function parseRegosObject(item: any, categories: Category[]): RegosParsedItem | null {
  if (!item || typeof item !== 'object') return null;

  // Scan keys
  let nameUz = '';
  let nameRu = '';
  let sku = '';
  let barcode = '';
  let price = 0;
  let costPrice = 0;
  let wholesalePrice = 0;
  let categoryName = '';
  let brand = '';
  let unit: 'kg' | 'dona' | 'litr' | 'quti' | 'pachka' = 'dona';
  let stock = 0;
  let image = '';
  let description = '';

  for (const [key, rawVal] of Object.entries(item)) {
    const val = String(rawVal ?? '').trim();
    const k = cleanKey(key);

    // Name detection
    if (k === 'name' || k === 'nameuz' || k === 'itemname' || k === 'title' || k.includes('наименование') || k.includes('nomi') || k.includes('tovarnomi')) {
      nameUz = val;
    } else if (k === 'nameru' || k.includes('русское') || k.includes('наименованиеru')) {
      nameRu = val;
    }
    // Barcode detection
    else if (k === 'barcode' || k === 'barcodes' || k.includes('штрихкод') || k.includes('shtrixkod') || k.includes('shtrix')) {
      barcode = val.replace(/\s+/g, '');
    }
    // SKU / Article detection
    else if (k === 'sku' || k === 'article' || k === 'artikul' || k.includes('артикул') || k.includes('kod') || k.includes('код')) {
      sku = val;
    }
    // Retail Price detection
    else if (k === 'price' || k === 'retailprice' || k === 'saleprice' || k.includes('розничная') || k.includes('roznitsa') || k.includes('chakana') || k.includes('цена') || k.includes('narx')) {
      const p = cleanNumber(rawVal);
      if (p > 0) price = p;
    }
    // Cost Price detection
    else if (k === 'costprice' || k === 'cost' || k === 'purchaseprice' || k === 'supplyprice' || k.includes('себестоимость') || k.includes('prixod') || k.includes('tannarx') || k.includes('kirim')) {
      const cp = cleanNumber(rawVal);
      if (cp > 0) costPrice = cp;
    }
    // Wholesale Price detection
    else if (k === 'wholesaleprice' || k === 'optomprice' || k.includes('оптовая') || k.includes('optom') || k.includes('ulgurji')) {
      const wp = cleanNumber(rawVal);
      if (wp > 0) wholesalePrice = wp;
    }
    // Category detection
    else if (k === 'category' || k === 'categoryname' || k === 'groupname' || k === 'group' || k.includes('категория') || k.includes('группа') || k.includes('kategoriya') || k.includes('bolim')) {
      categoryName = val;
    }
    // Brand detection
    else if (k === 'brand' || k === 'producer' || k.includes('бренд') || k.includes('производитель') || k.includes('ishlabchiqaruvchi')) {
      brand = val;
    }
    // Unit detection
    else if (k === 'unit' || k === 'unitname' || k.includes('единица') || k.includes('едизм') || k.includes('birlik') || k.includes('olchov')) {
      unit = normalizeUnit(val);
    }
    // Stock detection
    else if (k === 'stock' || k === 'quantity' || k === 'balance' || k.includes('остаток') || k.includes('qoldiq') || k.includes('miqdor')) {
      stock = cleanNumber(rawVal);
    }
    // Image detection
    else if (k === 'image' || k === 'photourl' || k === 'picture' || k.includes('фото') || k.includes('rasm')) {
      image = val;
    }
    // Description detection
    else if (k === 'description' || k.includes('описание') || k.includes('tavsif')) {
      description = val;
    }
  }

  // Fallbacks
  if (!nameUz && !nameRu) {
    // Check if there is an unkeyed single value or first field
    const values = Object.values(item);
    if (values.length > 0 && typeof values[0] === 'string' && values[0].length > 2) {
      nameUz = values[0];
    } else {
      return null;
    }
  }

  if (!nameUz && nameRu) nameUz = nameRu;
  if (!nameRu && nameUz) nameRu = nameUz;

  // Cost & Retail price adjustments
  if (price === 0 && costPrice > 0) {
    price = Math.round(costPrice * 1.3);
  } else if (costPrice === 0 && price > 0) {
    costPrice = Math.round(price / 1.3);
  } else if (price === 0 && costPrice === 0) {
    price = 15000;
    costPrice = 11000;
  }

  if (!wholesalePrice) {
    wholesalePrice = Math.round(costPrice * 1.15);
  }

  const vipPrice = Math.round(costPrice * 1.1);

  if (!sku) {
    sku = `RG-${Math.floor(100000 + Math.random() * 900000)}`;
  }
  if (!barcode) {
    barcode = `478${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  }

  const categoryId = matchCategoryId(categoryName, categories);

  return {
    nameUz,
    nameRu,
    sku,
    barcode,
    price,
    costPrice,
    wholesalePrice,
    vipPrice,
    categoryName,
    categoryId,
    brand: brand || 'Regos Partner',
    unit,
    stock,
    image,
    description: description || `${nameUz} - Regos Online orqali import qilingan tovar.`,
    raw: item,
  };
}

/**
 * Parses raw CSV / TSV text from Regos Export into RegosParsedItem array
 */
export function parseRegosCSV(csvText: string, categories: Category[]): RegosParsedItem[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Determine separator (comma, semicolon, or tab)
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t')) delimiter = '\t';
  else if (headerLine.includes(';') && (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length) {
    delimiter = ';';
  }

  const headers = parseCSVRow(headerLine, delimiter);
  const results: RegosParsedItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i], delimiter);
    if (row.length === 0) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] || '';
    });

    const parsed = parseRegosObject(rowObj, categories);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

function parseCSVRow(rowStr: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"') {
      if (inQuotes && rowStr[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Converts RegosParsedItem into standard Product model
 */
export function convertRegosItemToProduct(item: RegosParsedItem, existingProducts: Product[]): Product {
  // Check if product with same barcode or SKU exists
  const existing = existingProducts.find(
    (p) => (item.barcode && p.barcode === item.barcode) || (item.sku && p.sku === item.sku) || p.nameUz.toLowerCase() === item.nameUz.toLowerCase()
  );

  const id = existing ? existing.id : `rg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const stockMap: Record<string, number> = existing?.stockByBranch || {
    br_toshkent_main: item.stock || 0,
    br_chilanzar: 0,
    br_samarkand: 0,
  };

  return {
    id,
    sku: item.sku || (existing?.sku ?? `RG-${Math.floor(100000 + Math.random() * 900000)}`),
    barcode: item.barcode || (existing?.barcode ?? `478${Math.floor(1000000000 + Math.random() * 9000000000)}`),
    nameUz: item.nameUz,
    nameRu: item.nameRu || item.nameUz,
    nameEn: item.nameUz,
    categoryId: item.categoryId || existing?.categoryId || 'cat_grocery',
    brand: item.brand || existing?.brand || 'Regos Partner',
    price: item.price,
    costPrice: item.costPrice,
    prices: {
      prixod: item.costPrice,
      roznitsa: item.price,
      optom: item.wholesalePrice || Math.round(item.costPrice * 1.15),
      vip: item.vipPrice || Math.round(item.costPrice * 1.1),
    },
    unit: item.unit || 'dona',
    image: item.image || existing?.image || '',
    description: item.description || existing?.description || `${item.nameUz} (Regos Online)`,
    expiryDays: existing?.expiryDays || 180,
    isPopular: existing?.isPopular || false,
    minStockAlert: existing?.minStockAlert || 10,
    tags: existing?.tags || ['regos', 'import'],
    stockByBranch: stockMap,
  };
}
