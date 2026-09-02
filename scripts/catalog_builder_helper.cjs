const fs = require('fs');

// Canonical Categories Definition
const CATEGORIES = [
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

// Product flavor templates by category/type
const FLAVOR_SETS = {
  drinks: ['Olma', 'Shaftoli', 'Apelsin', 'Olcha', 'Anor', 'Multimeva', 'Qulupnay', 'Limon', 'Banan', 'Ananas', 'Kivi', 'Uzum', 'Tarxun', 'Barbaris', 'Mango'],
  dirol: ['Yalpizli (Spearmint)', 'Qulupnayli', 'Tarvuzli', 'Muzdek Yalpizli (Frosty Mint)', 'Mandarin va Sitrusli', 'Olchali', 'Eksotik Mevali'],
  orbit: ['Klassik Yalpizli', 'Bubblemint', 'Qulupnayli', 'Shirin Yalpizli', 'Evkaliptli', 'Malinali'],
  cakes: ['Shokoladli', 'Sutli va Qaymoqli', 'Qulupnayli', 'Vanilli', 'Bananli', 'Karamelli', 'Yong\'oqli'],
  cookies: ['Shokoladli Glazur', 'Klassik Sutli', 'Qaymoqli Krem', 'Kakao va Yong\'oq', 'Asalli', 'Sedana va Tuzli'],
  wafers: ['Shokoladli', 'Yong\'oqli', 'Qaymoqli', 'Vanilli', 'Limonli', 'Kofe ta\'mli'],
  candies: ['Meva assorti', 'Shokoladli praline', 'Karamel va yong\'oq', 'Marmeladli', 'Truffle', 'Sutli iris'],
  marmalade: ['Apelsin va Limon', 'Malina va Qulupnay', 'Olma va Nok', 'Mevali Mix', 'Gilosli'],
  tea: ['Klassik Qora', 'Limonli', 'Yalpiz va Moychechak', 'Ko\'k Bergamotli', 'Mevali Kompozitsiya', 'Yovvoyi Rezavorlar'],
  coffee: ['Klassik 3-in-1', 'Strong 3-in-1', 'Latte', 'Cappuccino', 'Eskpresso', 'Mocca'],
  dairy: ['Tabiiy 3.2%', 'Klassik 2.5%', 'Qaymoqli 4.0%', 'Yog\'siz 1.5%', 'Vitaminlashtirilgan'],
  cheese: ['Gollandskiy', 'Rossiyskiy', 'Gouda', 'Tilsiter', 'Suluguni', 'Motsarella'],
  sausage: ['Halol Mol Go\'shti', 'Klassik Doktorskaya', 'Servelat', 'Dudlangan Moskovskaya', 'Tovuq Go\'shtli'],
  shampoo: ['Qazg\'oqqa qarshi (Anti-Dandruff)', 'Soch to\'kilishiga qarshi', 'Oziqlantiruvchi moylar bilan', 'Chuqur tozalovchi Mentol', 'Ipakdek mayinlik va jilo'],
  soap: ['Antibakterial Klassik', 'Zaytun va Moychechak', 'Aloe Vera va Qaymoq', 'Dengiz minerallari', 'Atirgul va Lavanda'],
  detergent: ['Avtomat Tog\' nafasi', 'Avtomat Rangli kiyimlar uchun (Color)', 'Avtomat Lavanda xushbo\'y', 'Qo\'lda yuvish uchun'],
  chips: ['Smetana va Ko\'katlar', 'Dudlangan Pishloq', 'Klassik Tuzli', 'Qisqichbaqa (Krab)', 'Paprika va Qalampir', 'Dudlangan Gril']
};

function getSmartFlavors(groupName = '') {
  const g = groupName.toLowerCase();
  if (g.includes('dirol')) return FLAVOR_SETS.dirol;
  if (g.includes('orbit')) return FLAVOR_SETS.orbit;
  if (g.includes('fanta')) return ['Apelsin', 'Sitrus va Mandorin', 'Qulupnayli', 'Tropik Mevalar'];
  if (g.includes('sprite')) return ['Klassik Limon-Laym', 'Muzdek Yalpizli', 'Shakarsiz (Zero)'];
  if (g.includes('coca') || g.includes('pepsi') || g.includes('cola')) return ['Klassik', 'Zero (Shakarsiz)', 'Vanil (Vanilla)', 'Olcha (Cherry)'];
  if (g.includes('cake') || g.includes('rulet') || g.includes('keks') || g.includes('pirozhnoe') || g.includes('pirojnoye')) return FLAVOR_SETS.cakes;
  if (g.includes('pechen') || g.includes('cookie') || g.includes('rondo') || g.includes('biskvit')) return FLAVOR_SETS.cookies;
  if (g.includes('vafli') || g.includes('wafer')) return FLAVOR_SETS.wafers;
  if (g.includes('konfet') || g.includes('shokolad') || g.includes('shokalad') || g.includes('candy')) return FLAVOR_SETS.candies;
  if (g.includes('marmalad') || g.includes('marmelad')) return FLAVOR_SETS.marmalade;
  if (g.includes('choy') || g.includes('tea') || g.includes('чай') || g.includes('tess') || g.includes('greenfield')) return FLAVOR_SETS.tea;
  if (g.includes('kofe') || g.includes('coffee') || g.includes('кофе') || g.includes('maccoffee') || g.includes('nescafe')) return FLAVOR_SETS.coffee;
  if (g.includes('shampun') || g.includes('shampoo') || g.includes('head & shoulders') || g.includes('clear') || g.includes('pantene')) return FLAVOR_SETS.shampoo;
  if (g.includes('sovun') || g.includes('soap') || g.includes('мыло') || g.includes('duru') || g.includes('safeguard') || g.includes('dove')) return FLAVOR_SETS.soap;
  if (g.includes('poroshok') || g.includes('порошок') || g.includes('ariel') || g.includes('tide') || g.includes('persil')) return FLAVOR_SETS.detergent;
  if (g.includes('chips') || g.includes('lays') || g.includes('чипсы') || g.includes('kreshki') || g.includes('suxarik') || g.includes('grenki')) return FLAVOR_SETS.chips;
  if (g.includes('kolbasa') || g.includes('колбаса') || g.includes('sosiska') || g.includes('сосиски') || g.includes('sardelka')) return FLAVOR_SETS.sausage;
  if (g.includes('pishloq') || g.includes('sir ') || g.includes('сыр')) return FLAVOR_SETS.cheese;
  if (g.includes('sut') || g.includes('qatiq') || g.includes('kefir') || g.includes('moloko') || g.includes('молоко')) return FLAVOR_SETS.dairy;
  return FLAVOR_SETS.drinks;
}

// Master Precise Category Classifier
function classifyCategory(nameUz = '', groupName = '') {
  const t = (nameUz + ' ' + groupName).toLowerCase();

  // 1. Baby products (High Priority)
  if (t.includes('smes') || t.includes('смесь') || t.includes('kabrita') || t.includes('nan ') || t.includes('nestogen') || t.includes('nutrilak') || t.includes('bebelac') || t.includes('frutonyanya') || t.includes('agusha') || t.includes('gerber') || t.includes('kasha') || t.includes('каша') || t.includes('podguznik') || t.includes('подгузник') || t.includes('taglik') || t.includes('pampers') || t.includes('huggies') || t.includes('baby') || t.includes('bolalar') || t.includes('детск')) {
    return 'cat_bolalar';
  }

  // 2. Tea, Coffee, Cocoa (High Priority)
  if (t.includes('choy') || t.includes('чай') || t.includes(' tea') || t.includes('tea ') || t.includes('kofe') || t.includes('кофе') || t.includes('coffee') || t.includes('kakao') || t.includes('какао') || t.includes('maccoffee') || t.includes('nescafe') || t.includes('jacobs') || t.includes('greenfield') || t.includes('tess') || t.includes('lipton') || t.includes('ahmad tea') || t.includes('ceylon')) {
    return 'cat_choy_kofe';
  }

  // 3. Snacks, Chips, Crackers, Seeds, Nuts
  if (t.includes('suxarik') || t.includes('сухарик') || t.includes('grenki') || t.includes('гренки') || t.includes('kreshki') || t.includes('chips') || t.includes('чипсы') || t.includes('lays') || t.includes('cheetos') || t.includes('doritos') || t.includes('pringle') || t.includes('snack') || t.includes('snek') || t.includes('снек') || t.includes('qurt') || t.includes('курт') || t.includes('pista') || t.includes('семечки') || t.includes('bodom') || t.includes('миндаль') || t.includes('fistashka') || t.includes('фисташки') || t.includes('popkorn') || t.includes('попкорн') || t.includes('yong\'oq') || t.includes('орех')) {
    return 'cat_sneklar_chips';
  }

  // 4. Confectionery, Sweets, Chocolate, Biscuits, Wafers, Candies, Chewing gum
  if (t.includes('shokolad') || t.includes('shokalad') || t.includes('шоколад') || t.includes('chocolate') || t.includes('pechin') || t.includes('pechen') || t.includes('печенье') || t.includes('cookie') || t.includes('biskvit') || t.includes('бисквит') || t.includes('vafli') || t.includes('вафли') || t.includes('wafer') || t.includes('konfet') || t.includes('конфет') || t.includes('candy') || t.includes('karamel') || t.includes('карамель') || t.includes('marmelad') || t.includes('marmalad') || t.includes('мармелад') || t.includes('saqich') || t.includes('жвачка') || t.includes('жевательн') || t.includes('dirol') || t.includes('orbit') || t.includes('krember') || t.includes('kdv') || t.includes('yashkino') || t.includes('babyfox') || t.includes('bondi') || t.includes('panda') || t.includes('snickers') || t.includes('twix') || t.includes('bounty') || t.includes('mars') || t.includes('kitkat') || t.includes('kinder') || t.includes('alpen gold') || t.includes('milka') || t.includes('roshen') || t.includes('tort') || t.includes('торт') || t.includes('rulet') || t.includes('рулет') || t.includes('keks') || t.includes('кекс') || t.includes('cake') || t.includes('zifir') || t.includes('зефир') || t.includes('dr gerard') || t.includes('sfad') || t.includes('slad') || t.includes('shirinlik') || t.includes('сладост')) {
    return 'cat_shokolad_pechinni';
  }

  // 5. Beverages, Water, Soda, Juices, Energy drinks
  if (t.includes('suv') || t.includes('вода') || t.includes('water') || t.includes('sok') || t.includes('сок') || t.includes('juice') || t.includes('sharbat') || t.includes('ichimlik') || t.includes('напиток') || t.includes('cola') || t.includes('коле') || t.includes('кола') || t.includes('pepsi') || t.includes('пепси') || t.includes('fanta') || t.includes('фанта') || t.includes('sprite') || t.includes('спрайт') || t.includes('anora') || t.includes('biolife') || t.includes('moxito') || t.includes('мохито') || t.includes('time tea') || t.includes('juze') || t.includes('fructis') || t.includes('energetik') || t.includes('энергетик') || t.includes('flash') || t.includes('red bull') || t.includes('gorilla') || t.includes('adrenalin') || t.includes('borjomi') || t.includes('боржоми') || t.includes('chortoq') || t.includes('hydrolife') || t.includes('bonaqua') || t.includes('dena') || t.includes('dinay') || t.includes('viko') || t.includes('rich') || t.includes('limonat') || t.includes('limonad') || t.includes('лимонад') || t.includes('kompot') || t.includes('компот') || t.includes('ayron') || t.includes('айран') || t.includes('edigen') || t.includes('mojtaba')) {
    return 'cat_suvlar';
  }

  // 6. Meat, Poultry, Sausages, Dairy, Cheese, Fish
  if (t.includes('gosht') || t.includes("go'sht") || t.includes('мясо') || t.includes('meat') || t.includes('kolbasa') || t.includes('колбаса') || t.includes('sosiska') || t.includes('сосиски') || t.includes('sardelka') || t.includes('сардельки') || t.includes('farsh') || t.includes('фарш') || t.includes('tovuq') || t.includes('курица') || t.includes('file') || t.includes('филе') || t.includes('tegen') || t.includes('indeyka') || t.includes('индейка') || t.includes('tushonka') || t.includes('тушенка') || t.includes('sut') || t.includes('молоко') || t.includes('milk') || t.includes('qatiq') || t.includes('кефир') || t.includes('tvorog') || t.includes('творог') || t.includes('pishloq') || t.includes('сыр') || t.includes('cheese') || t.includes('smetana') || t.includes('сметана') || t.includes('yogurt') || t.includes('йогурт') || t.includes('qaymoq') || t.includes('сливки') || t.includes('musaffo') || t.includes('lactel') || t.includes('president') || t.includes('chudo') || t.includes('danone') || t.includes('baliq') || t.includes('рыба') || t.includes('tunes') || t.includes('тунец') || t.includes('shproti') || t.includes('шпроты') || t.includes('selyodka') || t.includes('сельдь')) {
    return 'cat_gosht_sut';
  }

  // 7. Personal Care, Cosmetics, Hygiene, Cleaning & Detergents
  if (t.includes('shampun') || t.includes('шампунь') || t.includes('shampoo') || t.includes('sovun') || t.includes('мыло') || t.includes('soap') || t.includes('gel') || t.includes('гель') || t.includes('tish pastasi') || t.includes('зубная паста') || t.includes('pasta') || t.includes('паста зуб') || t.includes('krem') || t.includes('крем') || t.includes('dezodorant') || t.includes('дезодорант') || t.includes('poroshok') || t.includes('порошок') || t.includes('ariel') || t.includes('tide') || t.includes('persil') || t.includes('fairy') || t.includes('salfetka') || t.includes('салфетки') || t.includes('gigiyena') || t.includes('гигиена') || t.includes('prokladki') || t.includes('прокладки') || t.includes('bella') || t.includes('kotex') || t.includes('always') || t.includes('colgate') || t.includes('nivea') || t.includes('rexona') || t.includes('dove') || t.includes('garnier') || t.includes('domestos') || t.includes('chistol') || t.includes('duru') || t.includes('safeguard') || t.includes('head & shoulders') || t.includes('pantene') || t.includes('parfumeriya') || t.includes('парфюмерия') || t.includes('kosmetika') || t.includes('косметика') || t.includes('atir') || t.includes('dush')) {
    return 'cat_parfumeriya_gigiyena';
  }

  // 8. Flour, Cooking Oils, Grains, Cereals
  if (t.includes('un ') || t.includes(' un') || t.includes('unlar') || t.includes('мука') || t.includes('flour') || t.includes('yog\'') || t.includes('maslo') || t.includes('масло') || t.includes('oil') || t.includes('saryog') || t.includes('сливочное масло') || t.includes('sloboda') || t.includes('shedevr') || t.includes('avedov') || t.includes('makfa') || t.includes('guruch') || t.includes('рис') || t.includes('rice') || t.includes('sholi') || t.includes('grechka') || t.includes('гречка') || t.includes('mosh') || t.includes('маш') || t.includes('fasol') || t.includes('фасоль') || t.includes('bug\'doy') || t.includes('don mahsulot')) {
    return 'cat_un_yog';
  }

  // 9. Pasta & Noodles
  if (t.includes('lapsha') || t.includes('лапша') || t.includes('makaron') || t.includes('макароны') || t.includes('rollton') || t.includes('роллтон') || t.includes('doshirak') || t.includes('доширак') || t.includes('spagetti') || t.includes('спагетти') || t.includes('pasta') || t.includes('паста') || t.includes('shebekin') || t.includes('шебекин') || t.includes('barilla') || t.includes('sultan makaron') || t.includes('vermishel') || t.includes('вермишель')) {
    return 'cat_lapsha_makaron';
  }

  // 10. Spices, Sauces, Ketchups, Pickles, Canned food
  if (t.includes('ziravor') || t.includes('специи') || t.includes('murch') || t.includes('перец') || t.includes('tuz ') || t.includes('соль') || t.includes('sirka') || t.includes('уксус') || t.includes('sous') || t.includes('соус') || t.includes('sauce') || t.includes('ketchup') || t.includes('кетчуп') || t.includes('mayonez') || t.includes('майонез') || t.includes('calve') || t.includes('heinz') || t.includes('konserva') || t.includes('консервы') || t.includes('makkajo\'xori') || t.includes('кукуруза') || t.includes('goroshek') || t.includes('горошек') || t.includes('zaytun') || t.includes('оливки') || t.includes('маслины') || t.includes('marinad') || t.includes('маринад') || t.includes('tomat pastas') || t.includes('томатная паста')) {
    return 'cat_ziravorlar_souslar';
  }

  // 11. Fresh Fruits and Vegetables
  if (t.includes('kartoshka') || t.includes('картофель') || t.includes('piyoz') || t.includes('лук') || t.includes('sabzi') || t.includes('морковь') || t.includes('pomidor') || t.includes('помидор') || t.includes('томат') || t.includes('bodring') || t.includes('огурцы') || t.includes('sarimsoq') || t.includes('чеснок') || t.includes('karam') || t.includes('капуста') || t.includes('ko\'kat') || t.includes('зелень') || t.includes('mevalar') || t.includes('sabzavot') || t.includes('фрукты') || t.includes('овощи')) {
    return 'cat_meva_sabzavot';
  }

  return 'cat_rozgor';
}

// Brand detector
function detectBrand(text = '') {
  const t = text.toUpperCase();
  const brands = [
    'COCA-COLA', 'COCA COLA', 'PEPSI', 'FANTA', 'SPRITE', 'NESTLE', 'LAYS', 'TEGEN', 'KREMBER', 'PANDA',
    'YASHKINO', 'BABYFOX', 'BONDI', 'OZERA', 'KDV', 'MUSAFFO', 'LACTEL', 'PRESIDENT', 'CHUDO', 'DANONE',
    'RED BULL', 'FLASH UP', 'ADRENALINE RUSH', 'GORILLA', 'MONSTER', 'CHORTOQ', 'HYDROLIFE', 'BORJOMI',
    'DENA', 'DINAY', 'VIKO', 'SOCHNAYA DOLINA', 'RICH', 'RANI', 'TIP TOP', 'VOSTOCHNIY SAD', 'TYAN-SHAN',
    'JUZE', 'BIOLIFE', 'ANORA', 'TIME TEA', 'FRUCTIS', 'VERANDA', 'RUSOMA', 'NELLI', 'BLUM', 'MACCOFFEE',
    'FAIRY', 'ARIEL', 'TIDE', 'PERSIL', 'PANTENE', 'HEAD & SHOULDERS', 'COLGATE', 'BLEND-A-MED', 'DOVE',
    'REXONA', 'NIVEA', 'PALMOLIVE', 'PAMPERS', 'HUGGIES', 'BEBELAC', 'NESTOGEN', 'NUTRILAK', 'FRUTONYANYA',
    'AGUSHA', 'KINDER', 'SNICKERS', 'MARS', 'TWIX', 'BOUNTY', 'KITKAT', 'ROSHEN', 'MILLENIUM', 'ALPEN GOLD',
    'MAKFA', 'SHEBEKINSKIE', 'BARILLA', 'ZOLOTOE SEMECHKO', 'OLEINA', 'SHEDROE LETO', 'SLOBODA', 'CALVE',
    'HEINZ', 'NESCAFE', 'JACOBS', 'GREENFIELD', 'TESS', 'LIPTON', 'AHMAD TEA', 'CHESTNOE KOROVYE',
    'MOLOCHNAYA RECHKA', 'DOBRY', 'MOYA SEMYA', 'PAPA KARLO', 'MAZZALI', 'SULTAN', 'ZIFIR', 'BON AQUA',
    'BONAQUA', 'DOBRIY', 'NASH SAD', 'CHIGATOY', 'CHIG\'ATOY', 'HASAR', 'SFAD', 'ALPRO', 'ACTIMEL', 'DANISSIMO',
    'DIROL', 'ORBIT', 'NATURELLA', 'DR GERARD', 'EDIGEN', 'MOJTABA', 'RONI CAKE', 'AZOVSKAYA', 'BISKVI', 'PEKI', 'BELLA'
  ];

  for (const b of brands) {
    if (t.includes(b)) {
      if (b === 'COCA COLA' || b === 'COCA-COLA') return 'Coca-Cola';
      if (b === 'BON AQUA' || b === 'BONAQUA') return 'BonAqua';
      if (b === 'FLASH UP') return 'Flash Up';
      if (b === 'RED BULL') return 'Red Bull';
      if (b === 'ADRENALINE RUSH') return 'Adrenaline Rush';
      if (b === 'NASH SAD') return 'Nash Sad';
      if (b === 'DR GERARD') return 'Dr Gerard';
      if (b === 'RONI CAKE') return 'Roni Cake';
      return b.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    }
  }
  return 'Sifatli Mahsulot';
}

// Relevant contextual product images
function getContextImage(nameUz = '', categoryId = '') {
  const n = nameUz.toLowerCase();
  if (n.includes('olma')) return 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=500&auto=format&fit=crop&q=80';
  if (n.includes('shaftoli')) return 'https://images.unsplash.com/photo-1629828874514-c1e5103f2150?w=500&auto=format&fit=crop&q=80';
  if (n.includes('apelsin')) return 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80';
  if (n.includes('olcha') || n.includes('gilos')) return 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=500&auto=format&fit=crop&q=80';
  if (n.includes('anor')) return 'https://images.unsplash.com/photo-1541344999736-83eca872f242?w=500&auto=format&fit=crop&q=80';
  if (n.includes('qulupnay')) return 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&auto=format&fit=crop&q=80';
  if (n.includes('banan')) return 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80';
  if (n.includes('ananas')) return 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500&auto=format&fit=crop&q=80';
  if (n.includes('limon') || n.includes('laym')) return 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&auto=format&fit=crop&q=80';
  if (n.includes('multimeva') || n.includes('tropik')) return 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&auto=format&fit=crop&q=80';
  if (n.includes('tarvuz')) return 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&auto=format&fit=crop&q=80';
  if (n.includes('yalpiz') || n.includes('mint')) return 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=500&auto=format&fit=crop&q=80';
  if (n.includes('shokolad') || n.includes('chocolate') || n.includes('kakao')) return 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=80';
  if (n.includes('pechen') || n.includes('cookie') || n.includes('biskvit') || n.includes('rondo')) return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80';
  if (n.includes('vafli') || n.includes('wafer')) return 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=500&auto=format&fit=crop&q=80';
  if (n.includes('rulet') || n.includes('tort') || n.includes('cake') || n.includes('keks')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80';
  if (n.includes('saqich') || n.includes('dirol') || n.includes('orbit')) return 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80';
  if (n.includes('marmalad') || n.includes('marmelad')) return 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=80';
  if (n.includes('chips') || n.includes('lays') || n.includes('kreshki') || n.includes('suxarik') || n.includes('grenki')) return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80';
  if (n.includes('pepsi') || n.includes('coca') || n.includes('cola')) return 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500&auto=format&fit=crop&q=80';
  if (n.includes('fanta')) return 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=500&auto=format&fit=crop&q=80';
  if (n.includes('sprite')) return 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&auto=format&fit=crop&q=80';
  if (n.includes('energetik') || n.includes('red bull') || n.includes('flash') || n.includes('gorilla')) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80';
  if (n.includes('suv') || n.includes('borjomi') || n.includes('chortoq') || n.includes('hydrolife')) return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80';
  if (n.includes('sut') || n.includes('qatiq') || n.includes('kefir') || n.includes('musaffo') || n.includes('lactel')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80';
  if (n.includes('pishloq') || n.includes('sir ') || n.includes('tvorog') || n.includes('president')) return 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&auto=format&fit=crop&q=80';
  if (n.includes('gosht') || n.includes('kolbasa') || n.includes('sosiska') || n.includes('tegen')) return 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=500&auto=format&fit=crop&q=80';
  if (n.includes('choy') || n.includes('tea') || n.includes('tess') || n.includes('greenfield')) return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80';
  if (n.includes('kofe') || n.includes('coffee') || n.includes('nescafe') || n.includes('maccoffee')) return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80';
  if (n.includes('shampun') || n.includes('sovun') || n.includes('duru') || n.includes('dove') || n.includes('safeguard')) return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80';
  if (n.includes('poroshok') || n.includes('ariel') || n.includes('tide') || n.includes('persil') || n.includes('fairy')) return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80';
  if (n.includes('yog\'') || n.includes('maslo') || n.includes('sloboda') || n.includes('shedevr') || n.includes('zaytun')) return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80';
  if (n.includes('makaron') || n.includes('lapsha') || n.includes('spagetti') || n.includes('makfa')) return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80';
  if (n.includes('ziravor') || n.includes('sous') || n.includes('ketchup') || n.includes('mayonez') || n.includes('heinz')) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80';
  if (n.includes('bolalar') || n.includes('agusha') || n.includes('frutonyanya') || n.includes('pampers') || n.includes('smes') || n.includes('kabrita')) return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80';

  // Fallbacks by category
  switch (categoryId) {
    case 'cat_suvlar': return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80';
    case 'cat_shokolad_pechinni': return 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=80';
    case 'cat_gosht_sut': return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80';
    case 'cat_parfumeriya_gigiyena': return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80';
    case 'cat_choy_kofe': return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80';
    case 'cat_meva_sabzavot': return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&auto=format&fit=crop&q=80';
    case 'cat_sneklar_chips': return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80';
    case 'cat_un_yog': return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80';
    case 'cat_lapsha_makaron': return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80';
    case 'cat_ziravorlar_souslar': return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80';
    case 'cat_bolalar': return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80';
    default: return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
  }
}

module.exports = {
  CATEGORIES,
  classifyCategory,
  detectBrand,
  getSmartFlavors,
  getContextImage
};
