import fs from 'fs';
import path from 'path';

function classifyProduct(title, categories) {
  const t = (title || '').toLowerCase();
  const catNames = (categories || []).map(c => (c.name || '').toLowerCase());
  const c = catNames.join(' ');
  const full = t + ' ' + c;

  // 1. DRINKS
  if (
    full.includes('сок') || full.includes('вода') || full.includes('напиток') || full.includes('напитки') ||
    full.includes('кола') || full.includes('pepsi') || full.includes('fanta') || full.includes('sprite') ||
    full.includes('чай') || full.includes('кофе') || full.includes('какао') || full.includes('компот') ||
    full.includes('морс') || full.includes('квас') || full.includes('энергетик') || full.includes('энергети') ||
    full.includes('пиво') || full.includes('вино') || full.includes('водка') || full.includes('коньяк') ||
    full.includes('виски') || full.includes('лимонад') || full.includes('нектар') || full.includes('боржоми') ||
    full.includes('chortoq') || full.includes('fuse') || full.includes('nestea') || full.includes('red bull') ||
    full.includes('flash') || full.includes('питьевая') || full.includes('минеральная') || full.includes('газиров') ||
    full.includes('прохладительн')
  ) {
    return 'cat_drinks';
  }

  // 2. FRUITS & VEGETABLES
  if (
    full.includes('яблоко') || full.includes('яблоки') || full.includes('груша') || full.includes('банан') ||
    full.includes('апельсин') || full.includes('мандарин') || full.includes('лимон') || full.includes('виноград') ||
    full.includes('персик') || full.includes('абрикос') || full.includes('киви') || full.includes('ананас') ||
    full.includes('клубника') || full.includes('огурец') || full.includes('огурцы') || full.includes('помидор') ||
    full.includes('томат') || full.includes('картофель') || full.includes('картошка') || full.includes('лук ') ||
    full.includes('морковь') || full.includes('капуста') || full.includes('перец') || full.includes('чеснок') ||
    full.includes('укроп') || full.includes('петрушка') || full.includes('салат') || full.includes('грибы') ||
    full.includes('хурма') || full.includes('гранат') || full.includes('слива') || full.includes('свекла') ||
    full.includes('авокадо') || full.includes('брокколи') || full.includes('кабачки') || full.includes('баклажан') ||
    full.includes('тыква') || full.includes('фисташки') || full.includes('миндаль') || full.includes('фундук') ||
    full.includes('кешью') || full.includes('арахис') || full.includes('изюм') || full.includes('курага') ||
    full.includes('чернослив') || full.includes('орехи') || full.includes('орех') || full.includes('сухофрукт') ||
    full.includes('фрукты') || full.includes('овощи') || full.includes('зелень')
  ) {
    return 'cat_fruits';
  }

  // 3. DAIRY & CHEESE
  if (
    full.includes('молоко') || full.includes('сыр') || full.includes('сыры') || full.includes('йогурт') ||
    full.includes('творог') || full.includes('сметана') || full.includes('кефир') || full.includes('сливки') ||
    full.includes('ряженка') || full.includes('каймак') || full.includes('сузьма') || full.includes('курт') ||
    full.includes('простокваша') || full.includes('масло сливочное') || full.includes('брынза') ||
    full.includes('сулугуни') || full.includes('маскарпоне') || full.includes('моцарелла') || full.includes('сырок') ||
    full.includes('сырки') || full.includes('сгущен') || full.includes('айран') || full.includes('молочн') ||
    full.includes('творожн')
  ) {
    return 'cat_dairy';
  }

  // 4. BAKERY & CONFECTIONERY
  if (
    full.includes('хлеб') || full.includes('батон') || full.includes('лепешка') || full.includes('булочк') ||
    full.includes('буханка') || full.includes('торт') || full.includes('торты') || full.includes('пирожно') ||
    full.includes('пирог') || full.includes('круассан') || full.includes('рулет') || full.includes('кекс') ||
    full.includes('сухари') || full.includes('сушки') || full.includes('лаваш') || full.includes('тесто') ||
    full.includes('выпечка') || full.includes('корж') || full.includes('слойка') || full.includes('пахлава')
  ) {
    return 'cat_bakery';
  }

  // 5. SNACKS & SWEETS
  if (
    full.includes('чипсы') || full.includes('чипс') || full.includes('сухарики') || full.includes('конфет') ||
    full.includes('конфета') || full.includes('шоколад') || full.includes('мороженое') || full.includes('сникерс') ||
    full.includes('марс') || full.includes('твикс') || full.includes('киндер') || full.includes('m&m') ||
    full.includes('драже') || full.includes('жвачка') || full.includes('попкорн') || full.includes('карамель') ||
    full.includes('леденцы') || full.includes('батончик') || full.includes('печенье') || full.includes('вафли') ||
    full.includes('пряники') || full.includes('халва') || full.includes('мармелад') || full.includes('зефир') ||
    full.includes('пастила') || full.includes('сладости') || full.includes('snack') || full.includes('nutella') ||
    full.includes('lays') || full.includes('pringles') || full.includes('cheetos') || full.includes('milka') ||
    full.includes('alpen gold') || full.includes('raffaello') || full.includes('ferrero') || full.includes('oreo')
  ) {
    return 'cat_snacks';
  }

  // 6. BABY CARE
  if (
    full.includes('подгузник') || full.includes('памперс') || full.includes('детск') || full.includes('пюре') ||
    full.includes('нутрилон') || full.includes('нан') || full.includes('агуша') || full.includes('тема') ||
    full.includes('фрутоняня') || full.includes('gerber') || full.includes('pampers') || full.includes('huggies')
  ) {
    return 'cat_baby';
  }

  // 7. HYGIENE & HOUSEHOLD
  if (
    full.includes('мыло') || full.includes('шампунь') || full.includes('гель') || full.includes('зубная') ||
    full.includes('порошок') || full.includes('средство') || full.includes('fairy') || full.includes('comet') ||
    full.includes('domestos') || full.includes('ariel') || full.includes('tide') || full.includes('бумага') ||
    full.includes('салфетки') || full.includes('освежитель') || full.includes('прокладки') || full.includes('ватные') ||
    full.includes('крем') || full.includes('дезодорант') || full.includes('бритва') || full.includes('чистящее') ||
    full.includes('губка') || full.includes('тряпка') || full.includes('пакеты') || full.includes('пленка') ||
    full.includes('гигиена') || full.includes('colgate') || full.includes('pantene')
  ) {
    return 'cat_hygiene';
  }

  // 8. GROCERY & RICE (Default for grocery)
  return 'cat_grocery';
}

function determineUnit(title) {
  const t = title.toLowerCase();
  if (t.includes('кг') || t.includes(' kg') || t.includes('килограмм')) return 'kg';
  if (t.includes(' л') || t.includes(' l') || t.includes('литр')) return 'l';
  return 'dona';
}

function cleanTitle(title) {
  return (title || '')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .trim();
}

async function fetchPage(page) {
  try {
    const url = `https://shop.tegen.uz/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log('Fetching ALL products from shop.tegen.uz (220+ pages)...');
  const maxPages = 230;
  const batchSize = 10;
  const allProducts = [];
  const seenIds = new Set();
  const outputPath = path.resolve('src/data/tegen_products.json');

  for (let start = 1; start <= maxPages; start += batchSize) {
    const pageNumbers = [];
    for (let p = start; p < start + batchSize && p <= maxPages; p++) {
      pageNumbers.push(p);
    }

    console.log(`Fetching pages ${pageNumbers[0]} to ${pageNumbers[pageNumbers.length - 1]}...`);
    const results = await Promise.all(pageNumbers.map(fetchPage));

    let batchAdded = 0;
    let emptyPagesInBatch = 0;

    for (const rawItems of results) {
      if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        emptyPagesInBatch++;
        continue;
      }

      for (const item of rawItems) {
        if (!item.id || seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        const title = cleanTitle(item.name || 'Tovar Tegen');
        const priceNum = parseInt(item.prices?.price || '0', 10) || 15000;
        const regularPrice = parseInt(item.prices?.regular_price || '0', 10) || priceNum;
        const discountPrice = priceNum < regularPrice ? priceNum : 0;
        const costPrice = Math.floor(priceNum * 0.8);
        const imageUrl = item.images && item.images[0] ? item.images[0].src : '';
        const categoryId = classifyProduct(title, item.categories);
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
          categoryId: categoryId,
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

        allProducts.push(prod);
        batchAdded++;
      }
    }

    console.log(`Progress: Total items compiled = ${allProducts.length}`);
    fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf-8');

    if (emptyPagesInBatch >= batchSize) {
      console.log('Reached end of available pages on TEGEN shop.');
      break;
    }
  }

  console.log(`\n========================================`);
  console.log(`Final Total Products Saved: ${allProducts.length}`);

  const counts = {};
  allProducts.forEach(p => { counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });
  console.log('Category Distribution:');
  console.dir(counts);
  console.log(`========================================\n`);
}

run();
