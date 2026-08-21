import fs from 'fs';
import path from 'path';

const CATEGORY_MAP = {
  // 1. DRINKS (cat_drinks)
  136: 'cat_drinks', // Вода / Напитки
  139: 'cat_drinks', // Вода
  140: 'cat_drinks', // Газированные напитки
  141: 'cat_drinks', // Прохладительные напитки
  137: 'cat_drinks', // Соки
  178: 'cat_drinks', // Кофе / Чай
  181: 'cat_drinks', // Кофе / Какао / Сливки
  996: 'cat_drinks', // Детские напитки и соки

  // 2. FRUITS & VEGETABLES (cat_fruits)
  131: 'cat_fruits', // Овощи и фрукты
  132: 'cat_fruits', // Овощи
  133: 'cat_fruits', // Фрукты
  134: 'cat_fruits', // Зелень
  135: 'cat_fruits', // Сухофрукты / Орехи

  // 3. DAIRY & CHEESE (cat_dairy)
  143: 'cat_dairy', // Яйца, молочная продукция
  144: 'cat_dairy', // Молоко / Молочные коктейли
  145: 'cat_dairy', // Кефир / Ряженка / Айран
  146: 'cat_dairy', // Йогурт
  147: 'cat_dairy', // Каймак / Сливки
  148: 'cat_dairy', // Сметана
  149: 'cat_dairy', // Творог
  150: 'cat_dairy', // Сырки
  151: 'cat_dairy', // Масло сливочное
  152: 'cat_dairy', // Сыры
  153: 'cat_dairy', // Сулугуни
  154: 'cat_dairy', // Брынза
  997: 'cat_dairy', // Сгущённое молоко

  // 4. BAKERY & CONFECTIONERY (cat_bakery)
  182: 'cat_bakery', // Хлебобулочные изделия
  184: 'cat_bakery', // Багеты / Батоны / Лепешки
  187: 'cat_bakery', // Лаваш
  303: 'cat_bakery', // Булочки
  188: 'cat_bakery', // Торты и сладости
  189: 'cat_bakery', // Торты и пирожные
  190: 'cat_bakery', // Печенье / Вафли / Пряники
  197: 'cat_bakery', // Восточные сладости
  192: 'cat_bakery', // Прочие сладости
  954: 'cat_bakery', // Кондитерские изделия

  // 5. SNACKS & SWEETS (cat_snacks)
  177: 'cat_snacks', // Снеки
  233: 'cat_snacks', // Мороженое
  191: 'cat_snacks', // Диабетические продукты

  // 6. BABY CARE (cat_baby)
  226: 'cat_baby', // Для детей
  228: 'cat_baby', // Детское питание
  230: 'cat_baby', // Предметы гигиены
  231: 'cat_baby', // Игрушки для детей
  227: 'cat_baby', // Детские принадлежности

  // 7. HYGIENE & HOUSEHOLD (cat_hygiene)
  213: 'cat_hygiene', // Гигиена
  216: 'cat_hygiene', // Туалетная бумага
  217: 'cat_hygiene', // Женская гигиена
  218: 'cat_hygiene', // Для бритья
  219: 'cat_hygiene', // Уход за волосами
  220: 'cat_hygiene', // Уход за лицом
  222: 'cat_hygiene', // Уход за полостью рта
  223: 'cat_hygiene', // Мыло туалетное
  224: 'cat_hygiene', // Средства для рук и ногтей
  225: 'cat_hygiene', // Прочее
  160: 'cat_hygiene', // Моющие средства
  161: 'cat_hygiene', // Стиральные порошки
  162: 'cat_hygiene', // Средства по уходу за бельем
  164: 'cat_hygiene', // Губки / Тряпки / Салфетки

  // 8. GROCERY & RICE (cat_grocery)
  165: 'cat_grocery', // Бакалея
  166: 'cat_grocery', // Крупы в упаковке
  167: 'cat_grocery', // Мука
  168: 'cat_grocery', // Сахар / Нават / Соль / Мед
  169: 'cat_grocery', // Макаронные изделия
  170: 'cat_grocery', // Масло растительное
  172: 'cat_grocery', // Маргарин
  173: 'cat_grocery', // Сухие завтраки
  174: 'cat_grocery', // Продукты быстрого приготовления
  175: 'cat_grocery', // Кетчупы / Соусы / Майонез
  176: 'cat_grocery', // Приправы / Специи
  982: 'cat_grocery', // Томатная паста
  198: 'cat_grocery', // Консервированная продукция
  983: 'cat_grocery', // Рыбные консервы
  156: 'cat_grocery', // Мясо и мясные изделия
  157: 'cat_grocery', // Говядина
  159: 'cat_grocery', // Мясо птицы
  252: 'cat_grocery', // Колбасные изделия
  241: 'cat_grocery', // Колбасы
  253: 'cat_grocery', // Сосиски
  242: 'cat_grocery', // Сосиски и Сардельки
  254: 'cat_grocery', // Мясные деликатесы
  942: 'cat_grocery', // Мясные деликатесы
  940: 'cat_grocery', // Свинина
  42: 'cat_grocery',  // Деликатесы
  244: 'cat_grocery', // Полуфабрикаты
  245: 'cat_grocery', // Маринад
  246: 'cat_grocery', // Соусы
  232: 'cat_grocery', // Замороженные продукты
  234: 'cat_grocery', // Полуфабрикаты
  235: 'cat_grocery', // Морепродукты
  194: 'cat_grocery', // Готовая продукция
  195: 'cat_grocery', // Салаты
  947: 'cat_grocery', // Готовая еда
  952: 'cat_grocery', // Корейские товары
  202: 'cat_grocery', // Для дома
  203: 'cat_grocery', // Пакеты / Бумаги / Пленка / Фольга
  205: 'cat_grocery', // Освежители
  206: 'cat_grocery', // Свечи / Спички
  207: 'cat_grocery', // Средства от насекомых
  209: 'cat_grocery', // Крем для обуви
  211: 'cat_grocery', // Все для кухни
  237: 'cat_grocery', // Товары для домашних животных
  238: 'cat_grocery', // Для кошек
  239: 'cat_grocery'  // Для собак
};

function refineCategory(title, defaultCat) {
  const t = (title || '').toLowerCase();

  // 1. DRINKS
  if (
    t.includes('сок') || t.includes('вода') || t.includes('напиток') || t.includes('напитки') ||
    t.includes('кола') || t.includes('pepsi') || t.includes('fanta') || t.includes('sprite') ||
    t.includes('чай') || t.includes('кофе') || t.includes('какао') || t.includes('компот') ||
    t.includes('морс') || t.includes('квас') || t.includes('энергетик') || t.includes('лимонад') ||
    t.includes('нектар') || t.includes('боржоми') || t.includes('chortoq') || t.includes('fuse') ||
    t.includes('nestea') || t.includes('red bull') || t.includes('flash') || t.includes('минеральная')
  ) {
    return 'cat_drinks';
  }

  // 2. FRUITS & VEGETABLES
  if (
    t.includes('яблоко') || t.includes('яблоки') || t.includes('груша') || t.includes('банан') ||
    t.includes('апельсин') || t.includes('мандарин') || t.includes('лимон') || t.includes('виноград') ||
    t.includes('персик') || t.includes('абрикос') || t.includes('киви') || t.includes('ананас') ||
    t.includes('клубника') || t.includes('огурец') || t.includes('огурцы') || t.includes('помидор') ||
    t.includes('картофель') || t.includes('лук ') || t.includes('морковь') || t.includes('капуста') ||
    t.includes('перец') || t.includes('чеснок') || t.includes('укроп') || t.includes('петрушка') ||
    t.includes('салат') || t.includes('грибы') || t.includes('хурма') || t.includes('гранат') ||
    t.includes('слива') || t.includes('свекла') || t.includes('авокадо') || t.includes('брокколи') ||
    t.includes('кабачки') || t.includes('баклажан') || t.includes('тыква') || t.includes('фисташки') ||
    t.includes('миндаль') || t.includes('фундук') || t.includes('кешью') || t.includes('арахис') ||
    t.includes('изюм') || t.includes('курага') || t.includes('чернослив')
  ) {
    return 'cat_fruits';
  }

  // 3. DAIRY
  if (
    t.includes('молоко') || t.includes('сыр') || t.includes('сыры') || t.includes('йогурт') ||
    t.includes('творог') || t.includes('сметана') || t.includes('кефир') || t.includes('сливки') ||
    t.includes('ряженка') || t.includes('каймак') || t.includes('сузьма') || t.includes('курт') ||
    t.includes('простокваша') || t.includes('масло сливочное') || t.includes('брынза') ||
    t.includes('сулугуни') || t.includes('маскарпоне') || t.includes('моцарелла') || t.includes('сырок') ||
    t.includes('сырки') || t.includes('сгущен') || t.includes('айран')
  ) {
    return 'cat_dairy';
  }

  // 4. BAKERY
  if (
    t.includes('хлеб') || t.includes('батон') || t.includes('лепешка') || t.includes('булочк') ||
    t.includes('буханка') || t.includes('торт') || t.includes('торты') || t.includes('пирожно') ||
    t.includes('пирог') || t.includes('круассан') || t.includes('рулет') || t.includes('кекс') ||
    t.includes('сухари') || t.includes('сушки') || t.includes('лаваш') || t.includes('тесто') ||
    t.includes('выпечка') || t.includes('корж')
  ) {
    return 'cat_bakery';
  }

  // 5. SNACKS
  if (
    t.includes('чипсы') || t.includes('чипс') || t.includes('сухарики') || t.includes('конфет') ||
    t.includes('конфета') || t.includes('шоколад') || t.includes('мороженое') || t.includes('сникерс') ||
    t.includes('марс') || t.includes('твикс') || t.includes('киндер') || t.includes('m&m') ||
    t.includes('драже') || t.includes('жвачка') || t.includes('попкорн') || t.includes('карамель') ||
    t.includes('леденцы') || t.includes('батончик') || t.includes('печенье') || t.includes('вафли') ||
    t.includes('пряники') || t.includes('халва') || t.includes('мармелад') || t.includes('зефир') ||
    t.includes('пастила') || t.includes('сладости') || t.includes('snack') || t.includes('nutella') ||
    t.includes('lays') || t.includes('pringles') || t.includes('cheetos') || t.includes('milka') ||
    t.includes('alpen gold') || t.includes('raffaello') || t.includes('ferrero') || t.includes('oreo')
  ) {
    return 'cat_snacks';
  }

  // 6. BABY CARE
  if (
    t.includes('подгузник') || t.includes('памперс') || t.includes('детск') || t.includes('пюре') ||
    t.includes('нутрилон') || t.includes('нан') || t.includes('агуша') || t.includes('тема') ||
    t.includes('фрутоняня') || t.includes('gerber') || t.includes('pampers') || t.includes('huggies')
  ) {
    return 'cat_baby';
  }

  // 7. HYGIENE
  if (
    t.includes('мыло') || t.includes('шампунь') || t.includes('гель') || t.includes('зубная') ||
    t.includes('порошок') || t.includes('средство') || t.includes('fairy') || t.includes('comet') ||
    t.includes('domestos') || t.includes('ariel') || t.includes('tide') || t.includes('бумага') ||
    t.includes('салфетки') || t.includes('освежитель') || t.includes('прокладки') || t.includes('ватные') ||
    t.includes('крем') || t.includes('дезодорант') || t.includes('бритва') || t.includes('чистящее') ||
    t.includes('губка') || t.includes('тряпка') || t.includes('пакеты') || t.includes('пленка') ||
    t.includes('colgate') || t.includes('pantene')
  ) {
    return 'cat_hygiene';
  }

  return defaultCat;
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

function isValidProduct(title) {
  if (!title) return false;
  const t = title.trim().toLowerCase();
  if (t.length < 3) return false;
  if (t === 'товар' || t === 'без имени' || t === 'product' || t.startsWith('товар ') || t === 'тест') return false;
  return true;
}

async function fetchCategoryPage(catId, page) {
  try {
    const url = `https://shop.tegen.uz/wp-json/wc/store/v1/products?category=${catId}&per_page=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log('Fetching ALL REAL Tegen products...');
  const catEntries = Object.entries(CATEGORY_MAP);
  const allProductsMap = new Map();
  const outputPath = path.resolve('src/data/tegen_products.json');

  // If previous file exists, load existing products so we accumulate instead of overwrite
  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      if (Array.isArray(existing)) {
        existing.forEach(p => allProductsMap.set(p.id, p));
        console.log(`Loaded ${allProductsMap.size} existing items from file.`);
      }
    } catch (e) {}
  }

  for (const [catIdStr, defaultCat] of catEntries) {
    const catId = parseInt(catIdStr, 10);
    let addedForCat = 0;

    for (let page = 1; page <= 10; page++) {
      const rawItems = await fetchCategoryPage(catId, page);
      if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) break;

      for (const item of rawItems) {
        if (!item.id || allProductsMap.has(`tgn_${item.id}`)) continue;

        const title = cleanTitle(item.name);
        if (!isValidProduct(title)) continue;

        const priceNum = parseInt(item.prices?.price || '0', 10) || 15000;
        if (priceNum <= 0) continue;

        const finalCat = refineCategory(title, defaultCat);
        const regularPrice = parseInt(item.prices?.regular_price || '0', 10) || priceNum;
        const discountPrice = priceNum < regularPrice ? priceNum : 0;
        const costPrice = Math.floor(priceNum * 0.8);
        const imageUrl = item.images && item.images[0] ? item.images[0].src : '';
        const unit = determineUnit(title);

        const sku = item.sku && item.sku.length > 2 ? item.sku : `TGN-${item.id}`;
        const barcode = `478${String(item.id).padStart(10, '0')}`;

        allProductsMap.set(`tgn_${item.id}`, {
          id: `tgn_${item.id}`,
          sku: sku,
          barcode: barcode,
          nameUz: title,
          nameRu: title,
          nameEn: title,
          brand: 'TEGEN Shop',
          categoryId: finalCat,
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
          tags: ['tegen', 'import', finalCat],
        });

        addedForCat++;
      }
    }

    if (addedForCat > 0) {
      const currentList = Array.from(allProductsMap.values());
      fs.writeFileSync(outputPath, JSON.stringify(currentList, null, 2), 'utf-8');
      console.log(`Cat ID ${catId} -> added ${addedForCat} items. Total accumulated: ${currentList.length}`);
    }
  }

  const resultList = Array.from(allProductsMap.values());

  console.log(`\n========================================`);
  console.log(`FINAL TOTAL REAL PRODUCTS COMPILED: ${resultList.length}`);

  const counts = {};
  resultList.forEach(p => { counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });
  console.log('Final Category Breakdown:');
  console.dir(counts);
  console.log(`========================================\n`);

  fs.writeFileSync(outputPath, JSON.stringify(resultList, null, 2), 'utf-8');
  console.log(`Successfully saved ${resultList.length} clean products to ${outputPath}`);
}

run();
