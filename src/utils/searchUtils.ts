import { Product, Category } from '../types';

/**
 * Uzbek Latin to Russian Cyrillic character mapping
 */
const LATIN_TO_CYRILLIC_MAP: Record<string, string> = {
  sh: 'ш',
  ch: 'ч',
  yo: 'ё',
  yu: 'ю',
  ya: 'я',
  ye: 'е',
  ts: 'ц',
  zh: 'ж',
  "o'": 'о',
  "o‘": 'о',
  "oʻ": 'о',
  "o`": 'о',
  "g'": 'г',
  "g‘": 'г',
  "gʻ": 'г',
  "g`": 'г',
  a: 'а',
  b: 'б',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'ж',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'х',
  y: 'й',
  z: 'з',
};

/**
 * Cyrillic to Uzbek Latin character mapping
 */
const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
};

/**
 * Convert Latin string to Cyrillic
 */
export function latinToCyrillic(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase().trim();
  s = s
    .replace(/sh/g, 'ш')
    .replace(/ch/g, 'ч')
    .replace(/yo/g, 'ё')
    .replace(/yu/g, 'ю')
    .replace(/ya/g, 'я')
    .replace(/ye/g, 'е')
    .replace(/ts/g, 'ц')
    .replace(/zh/g, 'ж')
    .replace(/o['‘ʻ`]/g, 'о')
    .replace(/g['‘ʻ`]/g, 'г');

  let res = '';
  for (const char of s) {
    res += LATIN_TO_CYRILLIC_MAP[char] || char;
  }
  return res;
}

/**
 * Convert Cyrillic string to Latin
 */
export function cyrillicToLatin(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase().trim();
  let res = '';
  for (const char of s) {
    res += CYRILLIC_TO_LATIN_MAP[char] !== undefined ? CYRILLIC_TO_LATIN_MAP[char] : char;
  }
  return res;
}

/**
 * Normalize vowels and sound-alikes for typo matching:
 * a <-> o, e <-> i, y <-> i, q/x/h <-> k, c <-> s
 */
export function normalizeVowelsAndSounds(str: string): string {
  if (!str) return '';
  let s = cyrillicToLatin(str.toLowerCase());
  s = s.replace(/['‘ʻ`"\-_.,/#!$%^&*;:{}=\\+|~()]/g, '');
  s = s.replace(/a/g, 'o');
  s = s.replace(/e/g, 'i');
  s = s.replace(/y/g, 'i');
  s = s.replace(/[qxh]/g, 'k');
  s = s.replace(/ts/g, 's').replace(/c/g, 's');
  s = s.replace(/w/g, 'v');
  s = s.replace(/(.)\1+/g, '$1');
  return s.trim();
}

/**
 * Semantic synonym groups (Uzbek <-> Russian <-> English)
 * Strictly product types, keeping brands isolated
 */
const SYNONYMS_LIST: string[][] = [
  // 1. Kolbasa & Sausages & Deli meats
  [
    'kalbasa',
    'kolbasa',
    'колбаса',
    'калбаса',
    'колбасы',
    'колбаски',
    'колбасный',
    'kolbaski',
    'sosiska',
    'sasiska',
    'сосиска',
    'сосиски',
    'сардельки',
    'sardelka',
    'ветчина',
    'vetchina',
    'докторская',
    'doktorskaya',
    'сервелат',
    'servelat',
    'салями',
    'salami',
  ],

  // 2. Meat & Poultry
  [
    'gosht',
    "go'sht",
    'myaso',
    'мясо',
    'мясной',
    'говядина',
    'govyadina',
    'курица',
    'куриный',
    'tovuq',
    'farsh',
    'qiyma',
    'фарш',
    'индейка',
  ],

  // 3. Chocolate & Candies
  [
    'shokolad',
    'shokalad',
    'shokolat',
    'shokalat',
    'шоколад',
    'шоколадный',
    'konfet',
    'kanfet',
    'конфеты',
    'конфета',
    'карамель',
    'karamel',
    'батончик',
    'batonchik',
    'chocolate',
  ],

  // 4. Cookies, Biscuits, Wafers, Bakery
  [
    'pechenye',
    'pechene',
    'pichenye',
    'печенье',
    'печенья',
    'biskvit',
    'бисквит',
    'бисквитное',
    'pirojnoe',
    'pirojnoye',
    'пирожное',
    'keks',
    'кекс',
    'вафли',
    'vafli',
    'вафельный',
    'vaflya',
    'cookies',
    'biscuit',
    'kreker',
    'крекер',
  ],

  // 5. Marmalade & Gummies
  [
    'marmelad',
    'marmilad',
    'мармелад',
    'жевательный',
    'zhevatelniy',
    'gummy',
    'zhele',
    'желе',
  ],

  // 6. Dairy (Milk, Cheese, Curd, Butter, Sour cream)
  [
    'sut',
    'moloko',
    'молоко',
    'молочный',
    'molochniy',
    'milk',
    'pishloq',
    'sir',
    'сыр',
    'сырок',
    'сырный',
    'cheese',
    'tvorog',
    'tvaroq',
    'творог',
    'qaymoq',
    'smetana',
    'сметана',
    'сливки',
    'slivki',
    'kefir',
    'кефир',
    'qatiq',
    'maslo',
    "sariyog'",
    'сливочное',
    'сгущенка',
    'sgushonka',
  ],

  // 7. Juices, Drinks, Water, Tea, Coffee
  [
    'sharbat',
    'sok',
    'soki',
    'сок',
    'соки',
    'juice',
    'nektar',
    'нектар',
    'smuzi',
    'smoothie',
    'смузи',
    'suv',
    'voda',
    'вода',
    'water',
    'choy',
    'chay',
    'чай',
    'tea',
    'kofe',
    'qahva',
    'coffee',
    'кофе',
  ],

  // 8. Baby food & Puree & Hematogen
  [
    'pyure',
    'pure',
    'пюре',
    'пауч',
    'pauch',
    'детское питание',
    'детский',
    'детское',
    'gematogen',
    'гематоген',
    'фенхель',
    'fenxel',
  ],

  // 9. Seeds, Chips, Snacks
  [
    'semichka',
    'semechka',
    'semechki',
    'семечки',
    'семена',
    'pista',
    'chips',
    'chipslar',
    'чипсы',
    'suxariki',
    'сухарики',
    'grenki',
    'гренки',
  ],

  // 10. Grocery & Staples
  [
    'makaron',
    'pasta',
    'макароны',
    'спагетти',
    'guruch',
    'ris',
    'рис',
    'shakar',
    'saxar',
    'сахар',
    'qand',
    'tuz',
    'sol',
    'соль',
    'un',
    'muka',
    'мука',
    'майонез',
    'mayonez',
    'кетчуп',
    'ketchup',
    'tomat',
    'sous',
  ],

  // 11. Fruits
  [
    'olma',
    'yabloko',
    'яблоко',
    'nok',
    'grusha',
    'груша',
    'shaftoli',
    'persik',
    'персик',
    'banan',
    'банан',
    'qulupnay',
    'klubnika',
    'клубника',
    'malina',
    'малина',
    'vishnya',
    'вишня',
    'chernika',
    'черника',
    'uzum',
    'vinograd',
    'виноград',
  ],

  // 12. Popular Brands Transliterations
  [
    'bondi',
    'бонди',
    'begemotik',
    'бегемотик',
    'hippo',
    'хиппо',
  ],
  [
    'babyfox',
    'бейбифокс',
    'бебифокс',
  ],
  [
    'kdv',
    'кдв',
  ],
  [
    'tegen',
    'теген',
  ],
];

/**
 * Retrieve synonyms for search expansion
 */
export function getSynonyms(queryToken: string): string[] {
  const qClean = queryToken.toLowerCase().trim();
  const qNorm = normalizeVowelsAndSounds(qClean);
  const result = new Set<string>();

  for (const group of SYNONYMS_LIST) {
    const isMatch = group.some((term) => {
      if (term === qClean) return true;
      if (normalizeVowelsAndSounds(term) === qNorm) return true;
      if (qClean.length >= 4 && term.startsWith(qClean)) return true;
      if (term.length >= 4 && qClean.startsWith(term)) return true;
      return false;
    });

    if (isMatch) {
      for (const t of group) result.add(t);
    }
  }

  return Array.from(result);
}

/**
 * Fast Levenshtein distance
 */
export function getLevenshteinDistance(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Pre-tokenized and normalized memory-efficient fast index
export interface FastProductIndex {
  barcode: string;
  sku: string;
  rawLower: string;
  latinLower: string;
  cyrLower: string;
  normLower: string;
  wordsSet: Set<string>;
  wordsLatinSet: Set<string>;
  wordsNormSet: Set<string>;
  nameUz: string;
  nameRu: string;
  nameUzLatin: string;
  nameRuLatin: string;
  brand: string;
  brandLatin: string;
  totalStock: number;
}

const productIndexCache = new WeakMap<Product, FastProductIndex>();

// Fast index getter with WeakMap caching
export function getProductFastIndex(product: Product): FastProductIndex {
  let idx = productIndexCache.get(product);
  if (idx) return idx;

  const barcode = (product.barcode || '').toLowerCase().trim();
  const barcodesStr = (product.barcodes || []).join(' ').toLowerCase();
  const sku = (product.sku || '').toLowerCase().trim();
  const nameUz = (product.nameUz || '').toLowerCase().trim();
  const nameRu = (product.nameRu || '').toLowerCase().trim();
  const nameEn = (product.nameEn || '').toLowerCase().trim();
  const brand = (product.brand || '').toLowerCase().trim();

  const nameUzLatin = cyrillicToLatin(nameUz);
  const nameRuLatin = cyrillicToLatin(nameRu);
  const brandLatin = cyrillicToLatin(brand);

  const rawLower = `${barcode} ${barcodesStr} ${sku} ${nameUz} ${nameRu} ${nameEn} ${brand} ${(product.tags || []).join(' ')}`.toLowerCase();
  const latinLower = cyrillicToLatin(rawLower);
  const cyrLower = latinToCyrillic(rawLower);
  const normLower = normalizeVowelsAndSounds(rawLower);

  const rawWords = rawLower.split(/[\s,.;:()\-–—"'/#!]+/).filter(Boolean);
  const latinWords = latinLower.split(/[\s,.;:()\-–—"'/#!]+/).filter(Boolean);
  const normWords = normLower.split(/[\s,.;:()\-–—"'/#!]+/).filter(Boolean);

  const totalStock = Object.values(product.stockByBranch || {}).reduce((a, b) => a + (Number(b) || 0), 0);

  idx = {
    barcode,
    sku,
    rawLower,
    latinLower,
    cyrLower,
    normLower,
    wordsSet: new Set(rawWords),
    wordsLatinSet: new Set(latinWords),
    wordsNormSet: new Set(normWords),
    nameUz,
    nameRu,
    nameUzLatin,
    nameRuLatin,
    brand,
    brandLatin,
    totalStock,
  };

  productIndexCache.set(product, idx);
  return idx;
}

export interface ParsedSearchQuery {
  raw: string;
  clean: string;
  latin: string;
  cyr: string;
  norm: string;
  tokens: string[];
  tokensLatin: string[];
  tokensCyr: string[];
  tokensNorm: string[];
  synonyms: string[][];
}

const queryParseCache = new Map<string, ParsedSearchQuery>();

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const clean = (query || '').trim().toLowerCase();
  let parsed = queryParseCache.get(clean);
  if (parsed) return parsed;

  const latin = cyrillicToLatin(clean);
  const cyr = latinToCyrillic(clean);
  const norm = normalizeVowelsAndSounds(clean);

  const tokens = clean.split(/[\s,.;:()\-–—"'/#!]+/).map((t) => t.trim()).filter(Boolean);
  const tokensLatin = tokens.map((t) => cyrillicToLatin(t));
  const tokensCyr = tokens.map((t) => latinToCyrillic(t));
  const tokensNorm = tokens.map((t) => normalizeVowelsAndSounds(t));
  const synonyms = tokens.map((t) => getSynonyms(t));

  parsed = {
    raw: query,
    clean,
    latin,
    cyr,
    norm,
    tokens,
    tokensLatin,
    tokensCyr,
    tokensNorm,
    synonyms,
  };

  if (queryParseCache.size > 200) {
    queryParseCache.clear();
  }
  queryParseCache.set(clean, parsed);
  return parsed;
}

/**
 * Intelligent Relevance Scoring Algorithm
 * Calculates how closely a product matches the search query.
 * Higher score = higher ranking in search results.
 */
export function calculateProductRelevanceScore(
  product: Product,
  query: string,
  categoryName?: string
): number {
  if (!query || !query.trim()) return 0;
  const parsed = parseSearchQuery(query);
  return calculateProductRelevanceScoreFast(product, parsed, categoryName);
}

/**
 * High-speed relevance scoring using pre-computed indices (O(1) lookups)
 */
export function calculateProductRelevanceScoreFast(
  product: Product,
  q: ParsedSearchQuery,
  categoryName?: string
): number {
  if (!q.clean) return 0;
  const idx = getProductFastIndex(product);

  let score = 0;

  // 1. Exact Barcode / SKU match (Highest priority: 10,000 pts)
  if (idx.barcode) {
    if (idx.barcode === q.clean) score += 10000;
    else if (idx.barcode.startsWith(q.clean)) score += 5000;
    else if (idx.barcode.includes(q.clean)) score += 2000;
  }
  if (idx.sku) {
    if (idx.sku === q.clean || idx.sku === q.latin) score += 8000;
    else if (idx.sku.startsWith(q.clean) || idx.sku.startsWith(q.latin)) score += 4000;
    else if (idx.sku.includes(q.clean) || idx.sku.includes(q.latin)) score += 1500;
  }

  // 2. Exact Title Match (3,000 pts)
  if (
    idx.nameUz === q.clean ||
    idx.nameRu === q.clean ||
    idx.nameUzLatin === q.latin ||
    idx.nameRuLatin === q.latin
  ) {
    score += 3000;
  }

  // 3. Title Starts With query (2,000 pts)
  if (
    idx.nameUz.startsWith(q.clean) ||
    idx.nameRu.startsWith(q.clean) ||
    idx.nameUzLatin.startsWith(q.latin) ||
    idx.nameRuLatin.startsWith(q.latin)
  ) {
    score += 2000;
  }

  // 4. Word-level fast Set lookups (1,000 pts per exact word)
  for (let i = 0; i < q.tokens.length; i++) {
    const token = q.tokens[i];
    const tokenLatin = q.tokensLatin[i];
    const tokenNorm = q.tokensNorm[i];

    // O(1) exact word set match
    if (idx.wordsSet.has(token) || idx.wordsLatinSet.has(tokenLatin)) {
      score += 1000;
    } else if (idx.wordsNormSet.has(tokenNorm)) {
      score += 350;
    } else if (idx.latinLower.includes(tokenLatin) || idx.rawLower.includes(token)) {
      score += 200;
    }

    // Brand match (500 pts)
    if (idx.brand && (idx.brand === token || idx.brandLatin === tokenLatin || idx.brandLatin.includes(tokenLatin))) {
      score += 500;
    }

    // Synonyms match (250 pts)
    const syns = q.synonyms[i];
    if (syns && syns.length > 0) {
      for (const syn of syns) {
        if (idx.wordsSet.has(syn) || idx.wordsLatinSet.has(syn)) {
          score += 250;
          break;
        }
      }
    }
  }

  // 5. General Substring Match in Title (100 pts)
  if (idx.nameUz.includes(q.clean) || idx.nameRu.includes(q.clean) || idx.nameUzLatin.includes(q.latin)) {
    score += 100;
  }

  // 6. Category match (50 pts)
  if (categoryName && categoryName.toLowerCase().includes(q.latin)) {
    score += 50;
  }

  // 7. Stock bonus
  if (idx.totalStock > 0) {
    score += 10;
  }

  return score;
}

/**
 * Fast & smart match test for a product against user query
 */
export function matchProductSearch(
  product: Product,
  query: string,
  categoryName?: string
): boolean {
  if (!query || !query.trim()) return true;
  const parsed = parseSearchQuery(query);
  return matchProductSearchFast(product, parsed, categoryName);
}

/**
 * Fast product match test using pre-computed index
 */
export function matchProductSearchFast(
  product: Product,
  q: ParsedSearchQuery,
  categoryName?: string
): boolean {
  if (!q.clean) return true;
  const idx = getProductFastIndex(product);

  // Fast exact code check
  if (idx.barcode && idx.barcode.includes(q.clean)) return true;
  if (idx.sku && (idx.sku.includes(q.clean) || idx.sku.includes(q.latin))) return true;

  // Category name test
  const catLower = categoryName ? categoryName.toLowerCase() : '';

  // All tokens in query must match something in the product
  for (let i = 0; i < q.tokens.length; i++) {
    const token = q.tokens[i];
    const tokenLatin = q.tokensLatin[i];
    const tokenCyr = q.tokensCyr[i];
    const tokenNorm = q.tokensNorm[i];

    // 1. Direct or transliterated substring check
    if (
      idx.rawLower.includes(token) ||
      idx.latinLower.includes(tokenLatin) ||
      idx.cyrLower.includes(tokenCyr) ||
      idx.rawLower.includes(tokenLatin)
    ) {
      continue;
    }

    // 2. Exact word or prefix match in sets
    if (idx.wordsSet.has(token) || idx.wordsLatinSet.has(tokenLatin)) {
      continue;
    }

    // 3. Normalized sound-alike check
    if (tokenNorm.length >= 3 && (idx.wordsNormSet.has(tokenNorm) || idx.normLower.includes(tokenNorm))) {
      continue;
    }

    // 4. Category check
    if (catLower && (catLower.includes(token) || catLower.includes(tokenLatin))) {
      continue;
    }

    // 5. Synonym expansion
    const syns = q.synonyms[i];
    let synFound = false;
    if (syns && syns.length > 0) {
      for (const syn of syns) {
        if (
          idx.wordsSet.has(syn) ||
          idx.wordsLatinSet.has(syn) ||
          idx.rawLower.includes(syn) ||
          idx.latinLower.includes(syn)
        ) {
          synFound = true;
          break;
        }
      }
    }
    if (synFound) continue;

    // Token failed to match
    return false;
  }

  return true;
}

/**
 * Filter products helper with categories map + RELEVANCE SORTING
 * Single-pass O(N) evaluation (< 1.5ms for 10,000 products)
 */
export function filterProductsSmart(
  products: Product[],
  query: string,
  categoryId: string = 'all',
  categories?: Category[],
  extraFilter?: (p: Product) => boolean
): Product[] {
  const catMap = new Map<string, string>();
  if (categories) {
    for (const cat of categories) {
      catMap.set(
        cat.id,
        `${cat.nameUz || ''} ${cat.nameRu || ''} ${cat.nameEn || ''}`
      );
    }
  }

  const cleanQuery = (query || '').trim();

  // If no search query, simple filter
  if (!cleanQuery) {
    return products.filter((p) => {
      if (categoryId !== 'all' && p.categoryId !== categoryId) return false;
      if (extraFilter && !extraFilter(p)) return false;
      return true;
    });
  }

  // Parse query ONCE
  const parsed = parseSearchQuery(cleanQuery);

  // Single-pass Filter + Relevance Scoring
  const scoredItems: Array<{ product: Product; score: number }> = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    // 1. Category check
    if (categoryId !== 'all' && p.categoryId !== categoryId) {
      continue;
    }

    // 2. Extra filter
    if (extraFilter && !extraFilter(p)) {
      continue;
    }

    const catName = p.categoryId ? catMap.get(p.categoryId) : '';

    // 3. Fast match check
    if (!matchProductSearchFast(p, parsed, catName)) {
      continue;
    }

    // 4. Calculate score
    const score = calculateProductRelevanceScoreFast(p, parsed, catName);
    scoredItems.push({ product: p, score });
  }

  // Sort ONLY the matched items (tiny array: 10-100 items)
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems.map((item) => item.product);
}
