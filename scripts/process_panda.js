import fs from 'fs';

const rawProducts = JSON.parse(fs.readFileSync('panda_raw_products.json', 'utf8'));
let mediaMap = {};
if (fs.existsSync('panda_media.json')) {
  mediaMap = JSON.parse(fs.readFileSync('panda_media.json', 'utf8'));
}

// Group products by title/name to merge language duplicates or multi-language entries
// Each WP post has a title and a link.
// WP API product_cat IDs:
// 188 / 56 / 74 -> Candies / Konfetlar / Конфеты
// 191 / 58 / 86 -> Chocolate candies / Shokoladli konfetlar / Шоколадные конфеты
// 193 / 52 / 97 -> Cookies / Pechenyelar / Печенье
// 44 / 178 / 64 -> Vafli / Waffles / Вафли
// 54 / 186 / 106 -> Vafli tayoqchalar / Wafer sticks / Вафельные палочки

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

// Map each product to a unified object by title/slug base
const mergedProductsMap = new Map();

rawProducts.forEach(p => {
  let title = p.title?.rendered ? p.title.rendered.replace(/&#\d+;/g, '').replace(/&amp;/g, '&').replace(/«|»/g, '"').trim() : '';
  if (!title || title.toLowerCase() === 'demo') return;

  // Image URL
  let imageUrl = mediaMap[p.featured_media] || '';

  // Determine category
  let catId = 'cat_panda_candies';
  if (Array.isArray(p.product_cat)) {
    for (const c of p.product_cat) {
      if (categoryMapping[c]) {
        catId = categoryMapping[c];
        break;
      }
    }
  }

  // Base key for merging versions
  // E.g. "Flowers", "Mukarram", "Moscow round", "Moscow круглое", "Panda boom", etc.
  let cleanName = title
    .replace(/\(kg\)|\(кг\)|\(dona\)|\(шт\)/gi, '')
    .replace(/ round$/i, '')
    .replace(/ круглое$/i, '')
    .trim();

  let key = cleanName.toLowerCase();

  if (!mergedProductsMap.has(key)) {
    mergedProductsMap.set(key, {
      title,
      cleanName,
      catId,
      image: imageUrl,
      link: p.link,
      ids: [p.id],
      productCatIds: p.product_cat || []
    });
  } else {
    const existing = mergedProductsMap.get(key);
    existing.ids.push(p.id);
    if (!existing.image && imageUrl) {
      existing.image = imageUrl;
    }
  }
});

console.log(`Merged ${rawProducts.length} raw WP entries into ${mergedProductsMap.size} unique Panda products.`);

// Let's print out the list of products by category
const catGroups = {
  'cat_panda_choc_candies': [],
  'cat_panda_candies': [],
  'cat_panda_cookies': [],
  'cat_panda_waffles': [],
  'cat_panda_wafer_sticks': []
};

Array.from(mergedProductsMap.values()).forEach(item => {
  if (!catGroups[item.catId]) {
    catGroups[item.catId] = [];
  }
  catGroups[item.catId].push(item);
});

Object.keys(catGroups).forEach(cId => {
  console.log(`Category ${cId}: ${catGroups[cId].length} products`);
  catGroups[cId].slice(0, 5).forEach(p => {
    console.log(`  - ${p.cleanName} (Img: ${p.image ? 'YES' : 'NO'})`);
  });
});
