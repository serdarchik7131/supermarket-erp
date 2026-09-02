import fs from 'fs';

const rawProducts = JSON.parse(fs.readFileSync('panda_raw_products.json', 'utf8'));
let mediaMap = {};
if (fs.existsSync('panda_media.json')) {
  mediaMap = JSON.parse(fs.readFileSync('panda_media.json', 'utf8'));
}

const categoryMapping = {
  // Candies / Konfetlar
  188: 'cat_panda_candies', 56: 'cat_panda_candies', 74: 'cat_panda_candies',
  // Chocolate candies
  191: 'cat_panda_choc_candies', 58: 'cat_panda_choc_candies', 86: 'cat_panda_choc_candies',
  // Cookies
  193: 'cat_panda_cookies', 52: 'cat_panda_cookies', 97: 'cat_panda_cookies',
  // Waffles
  44: 'cat_panda_waffles', 178: 'cat_panda_waffles', 64: 'cat_panda_waffles',
  // Wafer sticks
  54: 'cat_panda_wafer_sticks', 186: 'cat_panda_wafer_sticks', 106: 'cat_panda_wafer_sticks',
};

// Deduplicate
const mergedMap = new Map();

rawProducts.forEach(p => {
  let title = p.title?.rendered ? p.title.rendered.replace(/&#\d+;/g, '').replace(/&amp;/g, '&').replace(/«|»/g, '"').trim() : '';
  if (!title || title.toLowerCase() === 'demo') return;

  let imageUrl = mediaMap[p.featured_media] || '';

  let catId = 'cat_panda_candies';
  if (Array.isArray(p.product_cat)) {
    for (const c of p.product_cat) {
      if (categoryMapping[c]) {
        catId = categoryMapping[c];
        break;
      }
    }
  }

  let cleanName = title
    .replace(/\(kg\)|\(кг\)|\(dona\)|\(шт\)/gi, '')
    .replace(/ round$/i, '')
    .replace(/ круглое$/i, '')
    .trim();

  let key = cleanName.toLowerCase();

  if (!mergedMap.has(key)) {
    mergedMap.set(key, {
      rawId: p.id,
      title,
      cleanName,
      catId,
      image: imageUrl,
      link: p.link,
      slug: p.slug
    });
  } else {
    const existing = mergedMap.get(key);
    if (!existing.image && imageUrl) {
      existing.image = imageUrl;
    }
  }
});

const items = Array.from(mergedMap.values());
console.log(`Processing ${items.length} unique items from pandasanoatsavdo.uz...`);

let pandaIndex = 1000;

function getCategoryInfo(catId) {
  switch (catId) {
    case 'cat_panda_choc_candies':
      return { price: 68000, cost: 48000, unit: 'kg', suffixUz: 'Shokoladli Konfeti', suffixRu: 'Шоколадные конфеты', suffixEn: 'Chocolate Candies' };
    case 'cat_panda_candies':
      return { price: 42000, cost: 29000, unit: 'kg', suffixUz: 'Konfeti', suffixRu: 'Конфеты', suffixEn: 'Candies' };
    case 'cat_panda_cookies':
      return { price: 38000, cost: 26000, unit: 'kg', suffixUz: 'Pechenyesi', suffixRu: 'Печенье', suffixEn: 'Cookies' };
    case 'cat_panda_waffles':
      return { price: 45000, cost: 31000, unit: 'kg', suffixUz: 'Vafli', suffixRu: 'Вафли', suffixEn: 'Waffles' };
    case 'cat_panda_wafer_sticks':
      return { price: 48000, cost: 33000, unit: 'pachka', suffixUz: 'Vafli Tayoqchalari', suffixRu: 'Вафельные трубочки', suffixEn: 'Wafer Sticks' };
    default:
      return { price: 40000, cost: 28000, unit: 'kg', suffixUz: 'Qandolat Mahsuloti', suffixRu: 'Кондитерское изделие', suffixEn: 'Confectionery' };
  }
}

const pandaProducts = items.map(item => {
  pandaIndex++;
  const catInfo = getCategoryInfo(item.catId);
  const barcode = `478099${String(pandaIndex).padStart(7, '0')}`;
  const sku = `PND-${item.catId.replace('cat_panda_', '').substring(0, 3).toUpperCase()}-${pandaIndex}`;

  let nameBase = item.cleanName;
  // Beautify name if needed
  let nameUz = nameBase.includes('"') ? nameBase : `"${nameBase}"`;
  let nameRu = nameBase.includes('"') ? nameBase : `"${nameBase}"`;
  let nameEn = nameBase.includes('"') ? nameBase : `"${nameBase}"`;

  nameUz = `${nameUz} ${catInfo.suffixUz}`;
  nameRu = `${catInfo.suffixRu} ${nameRu}`;
  nameEn = `${nameBase} ${catInfo.suffixEn}`;

  const stockToshkent = Math.floor(Math.random() * 200) + 50;
  const stockChilanzar = Math.floor(Math.random() * 150) + 30;
  const stockSamarkand = Math.floor(Math.random() * 120) + 20;

  const costPrice = catInfo.cost;
  const price = catInfo.price;
  const optomPrice = Math.round(costPrice * 1.15);
  const vipPrice = Math.round(costPrice * 1.10);

  return {
    id: `pnd_${pandaIndex}`,
    sku: sku,
    barcode: barcode,
    nameUz: nameUz,
    nameRu: nameRu,
    nameEn: nameEn,
    brand: 'Panda Sanoat Savdo',
    categoryId: item.catId,
    description: `Panda Sanoat Savdo zavodida tayyorlangan oliy navli mazali ${catInfo.suffixUz.toLowerCase()}.`,
    price: price,
    discountPrice: Math.random() < 0.2 ? Math.round(price * 0.9) : undefined,
    costPrice: costPrice,
    minStockAlert: 15,
    unit: catInfo.unit,
    image: item.image || 'https://pandasanoatsavdo.uz/wp-content/uploads/2023/10/logo.png',
    stockByBranch: {
      br_toshkent_main: stockToshkent,
      br_chilanzar: stockChilanzar,
      br_samarkand: stockSamarkand,
    },
    prices: {
      pt_cost: costPrice,
      pt_retail: price,
      pt_wholesale: optomPrice,
      pt_vip: vipPrice,
    },
    expiryDays: 180,
    isPopular: Math.random() < 0.3,
    isPromotional: Math.random() < 0.25,
    tags: ['panda', 'panda sanoat savdo', 'qandolat', item.catId, item.cleanName.toLowerCase()],
  };
});

console.log(`Generated ${pandaProducts.length} full Panda products.`);
fs.writeFileSync('panda_generated_products.json', JSON.stringify(pandaProducts, null, 2));

// Update tegen_products.json
let tegen = [];
if (fs.existsSync('src/data/tegen_products.json')) {
  tegen = JSON.parse(fs.readFileSync('src/data/tegen_products.json', 'utf8'));
}

// Remove any previous panda products if re-running
const filteredTegen = tegen.filter(p => !p.id.startsWith('pnd_') && p.brand !== 'Panda Sanoat Savdo');
const combined = [...pandaProducts, ...filteredTegen];

fs.writeFileSync('src/data/tegen_products.json', JSON.stringify(combined, null, 2));
console.log(`Successfully updated src/data/tegen_products.json! Total products in database: ${combined.length}`);
