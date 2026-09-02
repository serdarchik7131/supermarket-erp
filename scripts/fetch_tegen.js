import fs from 'fs';
import path from 'path';

function mapCategory(title) {
  const t = title.toLowerCase();

  // Drinks
  if (
    t.includes('сок') || t.includes('вода') || t.includes('напиток') || t.includes('напитки') ||
    t.includes('кола') || t.includes('pepsi') || t.includes('fanta') || t.includes('sprite') ||
    t.includes('морс') || t.includes('компот') || t.includes('квас') || t.includes('энергети') ||
    t.includes('чай') || t.includes('кофе') || t.includes('лимонад') || t.includes('нектар') ||
    t.includes('боржоми') || t.includes('chortoq') || t.includes('пиво') || t.includes('вино') ||
    t.includes('водка') || t.includes('коньяк') || t.includes('виски') || t.includes('какао') ||
    t.includes('fuse') || t.includes('red bull') || t.includes('flash') || t.includes('nestea') ||
    t.includes('питьевая') || t.includes('минеральная')
  ) {
    return 'cat_drinks';
  }

  // Fruits & Vegetables
  if (
    t.includes('яблоко') || t.includes('яблоки') || t.includes('груша') || t.includes('банан') ||
    t.includes('апельсин') || t.includes('мандарин') || t.includes('лимон') || t.includes('виноград') ||
    t.includes('персик') || t.includes('абрикос') || t.includes('киви') || t.includes('ананас') ||
    t.includes('клубника') || t.includes('огурец') || t.includes('огурцы') || t.includes('помидор') ||
    t.includes('томат') || t.includes('картофель') || t.includes('лук') || t.includes('морковь') ||
    t.includes('капуста') || t.includes('перец') || t.includes('чеснок') || t.includes('зелень') ||
    t.includes('укроп') || t.includes('петрушка') || t.includes('салат') || t.includes('овощ') ||
    t.includes('фрукт') || t.includes('грибы') || t.includes('ягод') || t.includes('хурма') ||
    t.includes('гранат') || t.includes('слива') || t.includes('томаты') || t.includes('свекла')
  ) {
    return 'cat_fruits';
  }

  // Dairy & Cheese
  if (
    t.includes('молоко') || t.includes('кефир') || t.includes('сметана') || t.includes('творог') ||
    t.includes('сыр') || t.includes('йогурт') || t.includes('сливки') || t.includes('ряженка') ||
    t.includes('брынза') || t.includes('маскарпоне') || t.includes('сулугуни') || t.includes('каймак') ||
    t.includes('сузьма') || t.includes('курт') || t.includes('простокваша') || t.includes('масло сливочное') ||
    t.includes('творожн') || t.includes('молочн') || t.includes('сгущен') || t.includes('моцарелла')
  ) {
    return 'cat_dairy';
  }

  // Bakery & Confectionery
  if (
    t.includes('хлеб') || t.includes('лепешка') || t.includes('буханка') || t.includes('батон') ||
    t.includes('булочка') || t.includes('кекс') || t.includes('торт') || t.includes('пирожное') ||
    t.includes('сухари') || t.includes('сушки') || t.includes('лаваш') || t.includes('тесто') ||
    t.includes('круассан') || t.includes('рулет') || t.includes('пирог') || t.includes('печенье') ||
    t.includes('пряники') || t.includes('вафли') || t.includes('зефир') || t.includes('мармелад') ||
    t.includes('выпечка') || t.includes('сушка') || t.includes('корж')
  ) {
    return 'cat_bakery';
  }

  // Snacks & Chocolates
  if (
    t.includes('чипсы') || t.includes('сухарики') || t.includes('орешки') || t.includes('семечки') ||
    t.includes('шоколад') || t.includes('батончик') || t.includes('сникерс') || t.includes('марс') ||
    t.includes('твикс') || t.includes('киндер') || t.includes('m&m') || t.includes('драже') ||
    t.includes('жвачка') || t.includes('попкорн') || t.includes('конфеты') || t.includes('конфета') ||
    t.includes('карамель') || t.includes('леденцы') || t.includes('пастила') || t.includes('халва') ||
    t.includes('арахис') || t.includes('миндаль') || t.includes('фундук') || t.includes('фисташки') ||
    t.includes('кешью') || t.includes('ломтики')
  ) {
    return 'cat_snacks';
  }

  // Baby Care
  if (
    t.includes('подгузник') || t.includes('памперс') || t.includes('детск') || t.includes('пюре') ||
    t.includes('каша детская') || t.includes('нутрилон') || t.includes('нан') || t.includes('агуша') ||
    t.includes('тема') || t.includes('фрутоняня') || t.includes('gerber') || t.includes('pampers') ||
    t.includes('huggies')
  ) {
    return 'cat_baby';
  }

  // Hygiene & Household
  if (
    t.includes('мыло') || t.includes('шампунь') || t.includes('гель') || t.includes('зубная') ||
    t.includes('порошок') || t.includes('средство') || t.includes('fairy') || t.includes('comet') ||
    t.includes('domestos') || t.includes('ariel') || t.includes('tide') || t.includes('бумага') ||
    t.includes('салфетки') || t.includes('освежитель') || t.includes('прокладки') || t.includes('ватные') ||
    t.includes('крем') || t.includes('дезодорант') || t.includes('бритва') || t.includes('лезвие') ||
    t.includes('ополаскиватель') || t.includes('чистящее') || t.includes('моющее')
  ) {
    return 'cat_hygiene';
  }

  // Default Grocery & Rice
  return 'cat_grocery';
}

function determineUnit(title) {
  const t = title.toLowerCase();
  if (t.includes('кг') || t.includes(' kg') || t.includes('килограмм')) return 'kg';
  if (t.includes(' л') || t.includes('l') || t.includes('литр')) return 'l';
  return 'dona';
}

function cleanTitle(title) {
  return title
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

async function fetchPage(page) {
  try {
    const url = `https://shop.tegen.uz/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function run() {
  console.log('Fetching products concurrently from TEGEN Shop...');
  const pageNumbers = Array.from({ length: 20 }, (_, i) => i + 1);
  const results = await Promise.all(pageNumbers.map(fetchPage));
  
  const products = [];
  const seenIds = new Set();

  for (const rawItems of results) {
    if (!rawItems) continue;
    for (const item of rawItems) {
      if (!item.id || seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      const title = cleanTitle(item.name || 'Tovar Tegen');
      const priceNum = parseInt(item.prices?.price || '0', 10) || 15000;
      const regularPrice = parseInt(item.prices?.regular_price || '0', 10) || priceNum;
      const discountPrice = priceNum < regularPrice ? priceNum : 0;
      const costPrice = Math.floor(priceNum * 0.8);
      const imageUrl = item.images && item.images[0] ? item.images[0].src : '';
      const categoryId = mapCategory(title);
      const unit = determineUnit(title);

      const sku = item.sku && item.sku.length > 2 ? item.sku : `TGN-${item.id}`;
      const barcode = `478${String(item.id).padStart(10, '0')}`;

      const prod = {
        id: `tgn_${item.id}`,
        sku: sku,
        barcode: barcode,
        nameUz: title,
        nameRu: title,
        nameEn: title,
        brand: 'TEGEN Shop',
        categoryId: categoryId, // Strictly mapped to user project category
        description: item.short_description ? cleanTitle(item.short_description.replace(/<[^>]*>?/gm, '')) : `${title} - Tegen do'konining haqiqiy mahsuloti`,
        price: priceNum,
        discountPrice: discountPrice,
        costPrice: costPrice,
        minStockAlert: 10,
        unit: unit,
        image: imageUrl,
        stockByBranch: {
          br_toshkent_main: Math.floor(50 + (item.id % 150)),
          br_chilanzar: Math.floor(20 + (item.id % 80)),
          br_samarkand: Math.floor(10 + (item.id % 50)),
        },
        prices: {
          pt_cost: costPrice,
          pt_retail: priceNum,
          pt_wholesale: Math.floor(priceNum * 0.9),
          pt_vip: Math.floor(priceNum * 0.85),
        },
        expiryDays: 180,
        tags: ['tegen', 'import', categoryId],
      };

      products.push(prod);
    }
  }

  console.log(`Successfully compiled ${products.length} real products from TEGEN Shop!`);

  const outputPath = path.resolve('src/data/tegen_products.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf-8');
  console.log(`Saved products to ${outputPath}`);
}

run();
