const fs = require('fs');

const html = fs.readFileSync('/tmp/kdv_brand1.html', 'utf-8');

// Parse items
const sections = html.split(/<h2[^>]*id=\"(category-\d+)\"[^>]*>([\s\S]*?)<\/h2>/i);

const items = [];

function generateBarcode(seed) {
  let code = '460700' + String(seed).padStart(6, '0');
  // Calculate checksum for EAN-13
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  let check = (10 - (sum % 10)) % 10;
  return code + check;
}

let counter = 2001;

// Translation dictionary for common Russian confectionery terms to Uzbek
const uzTranslations = {
  'Бисквиты': 'Biskvitlar',
  'Кексы': 'Kekslar',
  'Торт вафельный': 'Vafli torti',
  'Мягкие вафли': 'Yumshoq vaflilar',
  'Вафельные трубочки': 'Vafli naychalari (trubochkalari)',
  'Вафли фасованные': 'Qadoqlangan vaflilar',
  'Драже фасованное': 'Qadoqlangan drajye',
  'Ирис  и щербет фасованный': 'Iris va sherbet',
  'Ирис и щербет фасованный': 'Iris va sherbet',
  'Крекер фасованный': 'Qadoqlangan kreker',
  'Круассаны': 'Kruassanlar',
  'Мука': 'Un',
  'Печенье фасованное': 'Qadoqlangan pechenye',
  'Пряники': 'Pryaniki (Shirin pishiriq)',
  'Шоколад': 'Shokolad',
  'С какао': 'Kakaoli',
  'Вишнёвый': 'Olchali',
  'Вишневый': 'Olchali',
  '«C варёной сгущёнкой»': 'Qaynatilgan quyultirilgan sutli (varenka)',
  '«С варёной сгущёнкой»': 'Qaynatilgan quyultirilgan sutli (varenka)',
  'Клубничный со сливками': 'Qaymoqli qulupnayli',
  'с шоколадным квусом': 'Shokolad ta\'mli',
  'с шоколадным вкусом': 'Shokolad ta\'mli',
  'Клубничный': 'Qulupnayli',
  'с солёной карамелью': 'Tuzli karamelli',
  'с вишневой начинкой и шоколадным кремом': 'Olchali va shokolad kremli',
  'с клубничной начинкой и сливочным кремом': 'Qulupnayli va qaymoqli kremli',
  'с орехом, глазированный': 'Yong\'oqli, shokolad sirlangan',
  'глазированный с орешками': 'Yong\'oqli, shokolad sirlangan',
  'с суфле': 'Sufleli',
  'с вареной сгущенкой': 'Qaynatilgan quyultirilgan sutli',
  'со сгущенным молоком': 'Quyultirilgan sutli (sgushchonkali)',
  'с ореховой начинкой': 'Yong\'oq mag\'izli',
  'сгущенное молоко': 'Quyultirilgan sutli',
  'со вкусом шоколада': 'Shokoladli',
  'с халвой': 'Holvali',
  'со вкусом топленого молока': 'Qaynatilgan sut (toplenoye moloko) ta\'mli',
  'с лимонным вкусом': 'Limonli',
  'с шоколадным кремом': 'Shokolad kremli',
  'Классический': 'Klassik',
  'Французский': 'Fransuzcha',
  'Бельгийский': 'Belgiya uslubidagi',
  'со вкусом пломбира': 'Plombir ta\'mli',
  'Арахис в глазури': 'Sirlangan yerong\'oq (arahis)',
  'Изюм в глазури': 'Sirlangan mayiz',
  'Золотой ирис': 'Oltin iris',
  'Сливочный': 'Qaymoqli',
  'с кунжутом': 'Kunjutli',
  'с сыром': 'Pishloqli',
  'с солью': 'Tuzli',
  'Пшеничная высший сорт': 'Oliy navli bug\'doy uni'
};

function translateSub(text) {
  let clean = text.trim();
  if (uzTranslations[clean]) return uzTranslations[clean];
  for (const [ru, uz] of Object.entries(uzTranslations)) {
    if (clean.toLowerCase().includes(ru.toLowerCase())) {
      clean = clean.replace(new RegExp(ru, 'gi'), uz);
    }
  }
  return clean;
}

function getCategoryForSection(catNameRaw) {
  const c = catNameRaw.toLowerCase();
  if (c.includes('вафл') || c.includes('трубоч')) return 'cat_kdv_waffles';
  if (c.includes('печень') || c.includes('пряник')) return 'cat_kdv_biscuits';
  if (c.includes('бисквит') || c.includes('кекс') || c.includes('торт')) return 'cat_kdv_cakes';
  if (c.includes('шоколад') || c.includes('драже') || c.includes('ирис') || c.includes('щербет')) return 'cat_kdv_sweets';
  if (c.includes('крекер') || c.includes('круассан')) return 'cat_kdv_snacks';
  if (c.includes('мука')) return 'cat_grocery';
  return 'cat_kdv_biscuits';
}

function estimatePrice(catNameRaw, weight) {
  let baseCost = 9000;
  const c = catNameRaw.toLowerCase();
  if (c.includes('торт')) baseCost = 28000;
  else if (c.includes('кекс') && weight.includes('500')) baseCost = 22000;
  else if (c.includes('бисквит') || c.includes('рулет')) baseCost = 13500;
  else if (c.includes('вафл')) baseCost = 9500;
  else if (c.includes('шоколад')) baseCost = 14000;
  else if (c.includes('драже')) baseCost = 8500;
  else if (c.includes('мука')) baseCost = 18000;
  else if (c.includes('круассан')) baseCost = 11000;
  else if (c.includes('крекер')) baseCost = 7500;

  const retail = Math.round(baseCost * 1.3 / 500) * 500;
  return { costPrice: baseCost, price: retail };
}

for (let i = 1; i < sections.length; i += 3) {
  const catId = sections[i];
  const catNameRaw = sections[i + 1].replace(/<[^>]+>/g, '').trim();
  const secHtml = sections[i + 2];
  
  const itemBlocks = secHtml.split(/<div[^>]*data-goodsId=/i);
  
  for (let j = 1; j < itemBlocks.length; j++) {
    const block = '<div data-goodsId=' + itemBlocks[j];
    
    const goodsIdMatch = block.match(/data-goodsId=\"(\d+)\"/);
    const offerIdMatch = block.match(/data-offerId=\"(\d+)\"/);
    const imgMatch = block.match(/data-original=\"([^\"]+)\"/);
    const weightMatch = block.match(/<div class=\"detail-string\"[^>]*>\s*<span>([\s\S]*?)<\/span>/i);
    const titleMatch = block.match(/<p>\s*<a[^>]*data-offerId=\"\d+\"[^>]*>([\s\S]*?)<\/a>\s*<\/p>/i);
    const isHit = block.includes('offer-label_hit') || block.includes('class=\"catalog-gallery-item hit\"');
    const isNew = block.includes('offer-label_new') || block.includes('class=\"catalog-gallery-item new\"');
    
    if (goodsIdMatch && titleMatch) {
      const goodsId = goodsIdMatch[1];
      const offerId = offerIdMatch ? offerIdMatch[1] : goodsId;
      const img = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : 'https://kdv-group.com' + imgMatch[1]) : '';
      const weight = weightMatch ? weightMatch[1].trim() : '';
      const subTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim().replace(/&laquo;|&raquo;|&quot;|&#8220;|&#8221;/g, '\"');
      
      const barcode = generateBarcode(counter++);
      const sku = 'KDV-YASH-' + goodsId + '-' + offerId;
      const catIdMapped = getCategoryForSection(catNameRaw);
      const { costPrice, price } = estimatePrice(catNameRaw, weight);
      
      const uzSub = translateSub(subTitle);
      const uzCat = uzTranslations[catNameRaw] || catNameRaw;
      
      const nameRu = `Яшкино ${catNameRaw} ${subTitle}${weight ? ' ' + weight : ''}`.replace(/\s+/g, ' ').trim();
      const nameUz = `Yashkino ${uzCat} ${uzSub}${weight ? ' ' + weight : ''}`.replace(/\s+/g, ' ').trim();
      const nameEn = `Yashkino ${catNameRaw} ${subTitle}${weight ? ' ' + weight : ''}`.replace(/\s+/g, ' ').trim();

      const unit = catNameRaw.toLowerCase().includes('мука') ? 'quti' : 'dona';

      const product = {
        id: `prod_kdv_${goodsId}_${offerId}`,
        sku,
        barcode,
        nameUz,
        nameRu,
        nameEn,
        categoryId: catIdMapped,
        brand: 'KDV (Яшкино)',
        price,
        costPrice,
        prices: {
          prixod: costPrice,
          roznitsa: price,
          optom: Math.round(price * 0.88 / 100) * 100,
          vip: Math.round(price * 0.82 / 100) * 100
        },
        unit,
        image: img,
        description: `${nameRu}. Оригинальная продукция KDV холдинга (бренд Яшкино). Свежая выпечка и кондитерские изделия высшего качества.`,
        descriptionUz: `${nameUz}. KDV xoldingining original 'Yashkino' brendi mahsuloti. Yuqori sifatli shirinlik va qandolat pishirig'i.`,
        descriptionRu: `${nameRu}. Настоящее кондитерское изделие от знаменитого бренда Яшкино (KDV Group).`,
        descriptionEn: `${nameEn}. Original confectionery from Yashkino / KDV Group.`,
        expiryDays: 180,
        isPopular: isHit,
        isPromotional: isNew,
        stockByBranch: {
          br_toshkent_main: 0,
          br_chilanzar: 0,
          br_samarkand: 0
        },
        minStockAlert: 15,
        tags: ['kdv', 'yashkino', 'яшкино', catNameRaw.toLowerCase(), subTitle.toLowerCase(), 'shirinlik', 'vafli', 'pechenye'],
        isActive: true
      };
      
      items.push(product);
    }
  }
}

console.log('Total KDV products prepared:', items.length);
fs.writeFileSync('src/data/kdv_products.json', JSON.stringify(items, null, 2));
console.log('Saved to src/data/kdv_products.json');
