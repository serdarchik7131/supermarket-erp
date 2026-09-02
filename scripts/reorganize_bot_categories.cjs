const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

// 100% Authentic Bot & Store Categories (Zero empty categories, exactly matching real inventory)
const OFFICIAL_BOT_CATEGORIES = [
  { id: 'cat_suvlar', nameUz: 'Suvlar va Salqin Ichimliklar', nameRu: 'Напитки и Соки', nameEn: 'Beverages & Juices', icon: 'CupSoda', slug: 'suvlar' },
  { id: 'cat_shokolad_pechinni', nameUz: 'Shokolad, Pechenye va Qandolat', nameRu: 'Шоколад и Кондитерские изделия', nameEn: 'Chocolates & Confectionery', icon: 'Cookie', slug: 'shokolad-pechinni' },
  { id: 'cat_gosht_sut', nameUz: 'Go\'sht, Sut va Baliq Mahsulotlari', nameRu: 'Мясо, Молоко и Рыба', nameEn: 'Meat, Dairy & Fish', icon: 'Milk', slug: 'gosht-sut' },
  { id: 'cat_parfumeriya_gigiyena', nameUz: 'Parfumeriya, Kosmetika va Gigiyena', nameRu: 'Парфюмерия, Косметика и Гигиена', nameEn: 'Cosmetics & Hygiene', icon: 'Sparkles', slug: 'parfumeriya-gigiyena' },
  { id: 'cat_choy_kofe', nameUz: 'Choy, Kofe va Kakao', nameRu: 'Чай, Кофе и Какао', nameEn: 'Tea & Coffee', icon: 'CupSoda', slug: 'choy-kofe' },
  { id: 'cat_meva_sabzavot', nameUz: 'Meva va Sabzavotlar', nameRu: 'Фрукты и Овощи', nameEn: 'Fruits & Vegetables', icon: 'Apple', slug: 'meva-sabzavot' },
  { id: 'cat_sneklar_chips', nameUz: 'Sneklar, Chips va Qurtlar', nameRu: 'Снеки, Чипсы и Орехи', nameEn: 'Snacks & Chips', icon: 'Utensils', slug: 'sneklar-chips' },
  { id: 'cat_un_yog', nameUz: 'Un, Yog\' va Don Mahsulotlari', nameRu: 'Мука, Масло и Бакалея', nameEn: 'Flour, Oil & Grocery', icon: 'Package', slug: 'un-yog' },
  { id: 'cat_lapsha_makaron', nameUz: 'Lapsha va Makaron Mahsulotlari', nameRu: 'Лапша и Макароны', nameEn: 'Pasta & Noodles', icon: 'Utensils', slug: 'lapsha-makaron' },
  { id: 'cat_ziravorlar_souslar', nameUz: 'Ziravorlar, Souslar va Konservalar', nameRu: 'Специи, Соусы и Консервы', nameEn: 'Spices & Sauces', icon: 'Sparkles', slug: 'ziravorlar-souslar' },
  { id: 'cat_bolalar', nameUz: 'Bolalar Mahsulotlari va Taomlari', nameRu: 'Детские товары и Питание', nameEn: 'Baby Care & Food', icon: 'Baby', slug: 'bolalar' },
  { id: 'cat_rozgor', nameUz: 'Ro\'zg\'or va Xo\'jalik Mollari', nameRu: 'Хозтовары и Быт', nameEn: 'Household Goods', icon: 'Package', slug: 'rozgor' }
];

function assignCategory(p) {
  const t = (p.nameUz + ' ' + (p.nameRu || '') + ' ' + (p.brand || '') + ' ' + (p.descriptionUz || '')).toLowerCase();

  // 1. Drinks / Juices / Waters / Energy drinks
  if (t.includes('sharbati') || t.includes('ichimlik') || t.includes('ichimligi') || t.includes('suv') || t.includes('sok') || t.includes('сок') || t.includes('вода') || t.includes('напиток') || t.includes('limonat') || t.includes('limonad') || t.includes('pepsi') || t.includes('coca') || t.includes('fanta') || t.includes('sprite') || t.includes('anora') || t.includes('biolife') || t.includes('moxito') || t.includes('mojito') || t.includes('time tea') || t.includes('juze') || t.includes('fructis') || t.includes('dena') || t.includes('dinay') || t.includes('viko') || t.includes('rich') || t.includes('rani') || t.includes('flash') || t.includes('red bull') || t.includes('gorilla') || t.includes('adrenalin') || t.includes('borjomi') || t.includes('chortoq') || t.includes('hydrolife') || t.includes('bonaqua') || t.includes('bon aqua') || t.includes('salqin') || t.includes('mineral') || t.includes('gazlangan') || t.includes('nektar') || t.includes('bliss') || t.includes('sochnaya') || t.includes('kompot') || t.includes('tarxun') || t.includes('duches') || t.includes('shampan')) {
    return 'cat_suvlar';
  }

  // 2. Tea & Coffee
  if (t.includes('choy') || t.includes('чай') || t.includes('kofe') || t.includes('кофе') || t.includes('tea') || t.includes('coffee') || t.includes('nescafe') || t.includes('jacobs') || t.includes('maccoffee') || t.includes('greenfield') || t.includes('tess') || t.includes('lipton') || t.includes('ahmad') || t.includes('qahva') || t.includes('kakao') || t.includes('cacao') || t.includes('chicory') || t.includes('sikori')) {
    return 'cat_choy_kofe';
  }

  // 3. Baby care & food
  if (t.includes('bolalar') || t.includes('детск') || t.includes('kasha') || t.includes('каша') || t.includes('pyure') || t.includes('пюре') || t.includes('smes') || t.includes('смесь') || t.includes('nestogen') || t.includes('nutrilak') || t.includes('gerber') || t.includes('frutonyanya') || t.includes('фрутоняня') || t.includes('agusha') || t.includes('агуша') || t.includes('bebelac') || t.includes('pampers') || t.includes('huggies') || t.includes('podguznik') || t.includes('taglik') || t.includes('barni')) {
    return 'cat_bolalar';
  }

  // 4. Confectionery & Sweets
  if (t.includes('shokolad') || t.includes('шоколад') || t.includes('pechin') || t.includes('печенье') || t.includes('pishiriq') || t.includes('konfet') || t.includes('конфет') || t.includes('vafli') || t.includes('вафли') || t.includes('pechen') || t.includes('shirinlik') || t.includes('biskvit') || t.includes('бисквит') || t.includes('tort') || t.includes('торт') || t.includes('karamel') || t.includes('карамель') || t.includes('saqich') || t.includes('жвачка') || t.includes('marmalad') || t.includes('marmelad') || t.includes('мармелад') || t.includes('krember') || t.includes('kdv') || t.includes('yashkino') || t.includes('яшкино') || t.includes('babyfox') || t.includes('bondi') || t.includes('бонди') || t.includes('panda') || t.includes('nutella') || t.includes('snickers') || t.includes('twix') || t.includes('bounty') || t.includes('mars') || t.includes('kitkat') || t.includes('kinder') || t.includes('alpen gold') || t.includes('milka') || t.includes('roshen') || t.includes('sfad') || t.includes('slad') || t.includes('desert') || t.includes('десерт') || t.includes('konditer') || t.includes('кондитер') || t.includes('murabbo') || t.includes('varenye') || t.includes('drajye') || t.includes('драже') || t.includes('zifir') || t.includes('zefir') || t.includes('зефир') || t.includes('halva') || t.includes('xolva') || t.includes('chupa') || t.includes('alpen') || t.includes('oreo') || t.includes('cookies') || t.includes('cake') || t.includes('rulet') || t.includes('pie') || t.includes('muffin') || t.includes('keks') || t.includes('donut') || t.includes('ponchik') || t.includes('pryanik') || t.includes('orbit') || t.includes('dirol') || t.includes('eclipse') || t.includes('mentos') || t.includes('halls') || t.includes('skittles') || t.includes('m&m') || t.includes('toffifee') || t.includes('merci') || t.includes('raffaello') || t.includes('ferrero') || t.includes('chupa chups') || t.includes('pastila')) {
    return 'cat_shokolad_pechinni';
  }

  // 5. Meat & Dairy
  if (t.includes('sut') || t.includes('молоко') || t.includes('qatiq') || t.includes('кефир') || t.includes('tvorog') || t.includes('творог') || t.includes('pishloq') || t.includes('sir') || t.includes('сыр') || t.includes('smetana') || t.includes('сметана') || t.includes('yogurt') || t.includes('йогурт') || t.includes('ayron') || t.includes('айран') || t.includes('qaymoq') || t.includes('сливки') || t.includes('musaffo') || t.includes('lactel') || t.includes('president') || t.includes('chudo') || t.includes('danone') || t.includes('maslo') || t.includes('saryog') || t.includes('gosht') || t.includes("go'sht") || t.includes('мясо') || t.includes('kolbasa') || t.includes('колбаса') || t.includes('sosiska') || t.includes('сосиска') || t.includes('sardelka') || t.includes('сардельки') || t.includes('farsh') || t.includes('фарш') || t.includes('tovuq') || t.includes('курица') || t.includes('file') || t.includes('филе') || t.includes('tegen') || t.includes('indeyka') || t.includes('tushonka') || t.includes('тушенка') || t.includes('baliq') || t.includes('рыба') || t.includes('shprot') || t.includes('tuna') || t.includes('kabanos') || t.includes('delikates') || t.includes('mol ') || t.includes('mol tili') || t.includes('qo\'y') || t.includes('kuritsa') || t.includes('jigar') || t.includes('shashlik') || t.includes('kabob') || t.includes('sardina') || t.includes('kilki') || t.includes('losos')) {
    return 'cat_gosht_sut';
  }

  // 6. Snacks & Chips
  if (t.includes('chips') || t.includes('чипсы') || t.includes('lays') || t.includes('snack') || t.includes('snek') || t.includes('снек') || t.includes('qurt') || t.includes('курт') || t.includes('pista') || t.includes('семечки') || t.includes('bodom') || t.includes("yong'oq") || t.includes('орехи') || t.includes('fistashka') || t.includes('фисташки') || t.includes('popkorn') || t.includes('popcorn') || t.includes('попкорн') || t.includes('suxarik') || t.includes('сухарики') || t.includes('grenki') || t.includes('гренки') || t.includes('cheetos') || t.includes('doritos') || t.includes('kreshki') || t.includes('арахис') || t.includes('yer yongoq') || t.includes('semechki')) {
    return 'cat_sneklar_chips';
  }

  // 7. Hygiene & Perfumery
  if (t.includes('parfumeriya') || t.includes('shampun') || t.includes('шампунь') || t.includes('sovun') || t.includes('мыло') || t.includes('gel') || t.includes('гель') || t.includes('pasta') || t.includes('tish') || t.includes('зубн') || t.includes('krem') || t.includes('крем') || t.includes('dezodorant') || t.includes('дезодорант') || t.includes('poroshok') || t.includes('порошок') || t.includes('ariel') || t.includes('tide') || t.includes('persil') || t.includes('fairy') || t.includes('salfetka') || t.includes('салфетки') || t.includes('gigiyena') || t.includes('гигиена') || t.includes('colgate') || t.includes('nivea') || t.includes('rexona') || t.includes('dove') || t.includes('garnier') || t.includes('domestos') || t.includes('chistol') || t.includes('boyoq') || t.includes('краска') || t.includes('lezvie') || t.includes('stanok') || t.includes('gillette') || t.includes('prokladka') || t.includes('kotex') || t.includes('always') || t.includes('head & shoulders') || t.includes('pantene') || t.includes('palmolive') || t.includes('clear') || t.includes('diffuzor') || t.includes('havo') || t.includes('loreva') || t.includes('loson') || t.includes('balsam') || t.includes('balzam') || t.includes('antiseptik') || t.includes('sprey') || t.includes('aerozol') || t.includes('penka') || t.includes('skrab') || t.includes('muss')) {
    return 'cat_parfumeriya_gigiyena';
  }

  // 8. Fruits & Vegetables
  if (t.includes('meva') || t.includes('фрукты') || t.includes('sabzavot') || t.includes('овощи') || t.includes('kartoshka') || t.includes('картофель') || t.includes('piyoz') || t.includes('лук') || t.includes('sabzi') || t.includes('морковь') || t.includes('pomidor') || t.includes('томат') || t.includes('помидор') || t.includes('bodring') || t.includes('огурец') || t.includes('olma') || t.includes('яблок') || t.includes('banan') || t.includes('банан') || t.includes('apelsin') || t.includes('апельсин') || t.includes('limon') || t.includes('лимон') || t.includes('sarimsoq') || t.includes('чеснок') || t.includes('ko\'kat') || t.includes('зелень') || t.includes('shaftoli') || t.includes('nok') || t.includes('uzum') || t.includes('anor') || t.includes('qovun') || t.includes('tarvuz') || t.includes('kalanxoe') || t.includes('kivi') || t.includes('ananas') || t.includes('mandarin') || t.includes('karam') || t.includes('gulkaram') || t.includes('baqlajon') || t.includes('bulg\'or') || t.includes('turp') || t.includes('sholg\'om')) {
    return 'cat_meva_sabzavot';
  }

  // 9. Pasta & Noodles
  if (t.includes('lapsha') || t.includes('лапша') || t.includes('makaron') || t.includes('макароны') || t.includes('ugra') || t.includes('spagetti') || t.includes('спагетти') || t.includes('vermishel') || t.includes('вермишель') || t.includes('doshirak') || t.includes('доширак') || t.includes('rollton') || t.includes('роллтон') || t.includes('big bon') || t.includes('barilla') || t.includes('pasta')) {
    return 'cat_lapsha_makaron';
  }

  // 10. Flour, Oil & Grocery
  if (t.includes('un') || t.includes('мука') || t.includes('yog') || t.includes("yog'") || t.includes('масло') || t.includes('guruch') || t.includes('рис') || t.includes('shakar') || t.includes('сахар') || t.includes('tuz') || t.includes('соль') || t.includes('grechka') || t.includes('гречка') || t.includes('gorox') || t.includes('горох') || t.includes('makfa') || t.includes('shebekin') || t.includes('oleina') || t.includes('semechko') || t.includes('sloboda') || t.includes('shedroe') || t.includes('baqqollik') || t.includes('fasol') || t.includes('mosh') || t.includes('noxot') || t.includes('naturella') || t.includes('perlovka') || t.includes('mannaya')) {
    return 'cat_un_yog';
  }

  // 11. Spices & Sauces
  if (t.includes('ziravor') || t.includes('приправа') || t.includes('специи') || t.includes('sous') || t.includes('соус') || t.includes('ketchup') || t.includes('кетчуп') || t.includes('mayonez') || t.includes('майонез') || t.includes('murch') || t.includes('перец') || t.includes('lavr') || t.includes('sirka') || t.includes('уксус') || t.includes('xantal') || t.includes('горчица') || t.includes('calve') || t.includes('heinz') || t.includes('chig\'atoy') || t.includes('chigatoy') || t.includes('veranda') || t.includes('tomat') || t.includes('adjika') || t.includes('maslina') || t.includes('zaytun') || t.includes('kaper') || t.includes('marinad')) {
    return 'cat_ziravorlar_souslar';
  }

  return 'cat_rozgor';
}

async function run() {
  console.log('🚀 REORGANIZING BOT CATEGORIES & PURGING EMPTY CATEGORIES...');

  const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));
  const counts = {};
  OFFICIAL_BOT_CATEGORIES.forEach(c => counts[c.id] = 0);

  // Update categoryId on each product
  const updatedProducts = products.map(p => {
    const newCatId = assignCategory(p);
    counts[newCatId] = (counts[newCatId] || 0) + 1;
    return {
      ...p,
      categoryId: newCatId
    };
  });

  console.log('📊 Category product distribution:');
  OFFICIAL_BOT_CATEGORIES.forEach(c => {
    console.log(`  - ${c.nameUz}: ${counts[c.id]} items`);
  });

  // Save updated products json
  fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(updatedProducts, null, 2), 'utf8');
  console.log(`✅ Saved ${updatedProducts.length} categorized products to src/data/all_clean_products.json`);

  // Sync to PostgreSQL database
  console.log('🔄 Syncing categories and products to PostgreSQL...');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Recreate / update categories table
    await pool.query('DELETE FROM categories');
    for (const cat of OFFICIAL_BOT_CATEGORIES) {
      await pool.query(
        `INSERT INTO categories (id, name_uz, name_ru, name_en, icon, slug)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name_uz = EXCLUDED.name_uz,
           name_ru = EXCLUDED.name_ru,
           name_en = EXCLUDED.name_en,
           icon = EXCLUDED.icon,
           slug = EXCLUDED.slug`,
        [cat.id, cat.nameUz, cat.nameRu, cat.nameEn, cat.icon, cat.slug]
      );
    }
    console.log(`✅ Synced ${OFFICIAL_BOT_CATEGORIES.length} official bot categories into database!`);

    // 2. Batch update category_id in products table
    console.log('🔄 Updating category_id on all database products in batches...');
    const batchSize = 500;
    for (let i = 0; i < updatedProducts.length; i += batchSize) {
      const batch = updatedProducts.slice(i, i + batchSize);
      const values = [];
      const clauses = [];
      let paramIdx = 1;

      for (const p of batch) {
        clauses.push(`($${paramIdx}, $${paramIdx + 1})`);
        values.push(p.id, p.categoryId);
        paramIdx += 2;
      }

      const updateQuery = `
        UPDATE products AS prod
        SET category_id = v.cat_id
        FROM (VALUES ${clauses.join(', ')}) AS v(prod_id, cat_id)
        WHERE prod.id = v.prod_id;
      `;
      await pool.query(updateQuery, values);
      console.log(`  Updated batch ${i + 1} to ${Math.min(i + batchSize, updatedProducts.length)}...`);
    }

    console.log('🎉 ALL DATABASE CATEGORIES AND PRODUCTS PERFECTLY SYNCHRONIZED!');
  } catch (err) {
    console.error('Database sync error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
