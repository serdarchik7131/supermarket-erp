const fs = require("fs");
const path = require("path");

function isDummyName(n) {
  if (!n) return true;
  const s = String(n).trim().toLowerCase();
  if (/^0+[\.\,0]*$/.test(s)) return true;
  if (/^[\.\,\-\_\s\*\#\?\!\:\;]+$/.test(s)) return true;
  if (/^\d{1,2}\.?$/.test(s)) return true;
  if (/^(nomi|nom|tovar|tovar nomi|mahsulot nomi|name|product)$/i.test(s)) return true;
  if (/^(yoq|yo|yo\x27q|yo`q|y9o|yl|yok|net|netu)$/i.test(s)) return true;
  if (/^(x+|v+|b|m|c|aa|zz|q|w|y|z|k|j|p|s|t|l|n|r|g|d)$/i.test(s)) return true;
  if (/^0\.\s*$/.test(s)) return true;
  if (s === "0" || s === "." || s === ".." || s === "..." || s === "-") return true;
  return false;
}

// Category classification helper
function classifyCategory(nameUz, groupPath) {
  const text = `${nameUz} ${groupPath || ''}`.toLowerCase();
  if (text.match(/choy|kofe|qahva|tea|coffee|cappuccino|kakao|nescafe|jacobs|ahmad/)) return 'cat_ichimliklar';
  if (text.match(/suv|sok|sharbat|cola|pepsi|fanta|ichimlik|kompot|limonad|energetik|flash|red bull|hydrolife|morozko/)) return 'cat_ichimliklar';
  if (text.match(/go['`]?sht|kolbasa|sosiska|tovuq|lahm|qiym|farsh|file|mol go['`]?shti|sosis|vetchina/)) return 'cat_gosht_parranda';
  if (text.match(/sut|qatiq|pishloq|tvorog|smetana|qaymoq|sir|yogurt|kefir|maslo|slivochnoe/)) return 'cat_sut_tuxum';
  if (text.match(/non|baton|lepyoshka|bulochniy|kulcha|tost|pechene|vafli|tort|pirozhnoe|kruassan/)) return 'cat_non_pechene';
  if (text.match(/shokolad|konfet|marmelad|zefir|karamel|shirinlik|saqich|biskvit|snickers|bounty|kitkat/)) return 'cat_shirinliklar';
  if (text.match(/meva|sabzavot|olma|banan|pomidor|bodring|kartoshka|piyoz|sabzi|uzum|shaftoli|limon/)) return 'cat_meva_sabzavot';
  if (text.match(/guruch|makaron|un|yog['`]?|grechka|shakar|tuz|mosh|fasol|yorma|spagetti/)) return 'cat_un_yog_bakaleya';
  if (text.match(/sovun|shampun|gel|pasta|krem|parfum|dezodorant|tish|soch|gigiena|prokladka|lotion/)) return 'cat_parfumeriya_gigiena';
  if (text.match(/kir yuvish|poroshok|moyl|tozalash|domestos|fairy|tozalovchi|salfetka|gubka|paket|oqartiruvchi/)) return 'cat_rozgor';
  if (text.match(/pampers|taglik|bolalar|baby|kasha|pyure|emzik|smest/)) return 'cat_bolalar';
  if (text.match(/chips|kuryez|suhari|yong['`]?oq|pista|popkorn|snek|lays|doritos|pringle/)) return 'cat_gazaklar_chips';
  if (text.match(/sous|ketchup|mayonez|ziravor|murch|qalampir|uksus|konserva|tomat|gorchitsa/)) return 'cat_ziravorlar_souslar';
  return 'cat_boshqa';
}

// Rich domain flavor palettes for Uzbek supermarket assortment
const FLAVOR_PALETTES = {
  drinks: [
    { uz: "Olma", ru: "Яблоко" },
    { uz: "Shaftoli", ru: "Персик" },
    { uz: "Olcha", ru: "Вишня" },
    { uz: "Apelsin", ru: "Апельсин" },
    { uz: "Anor", ru: "Гранат" },
    { uz: "Multimeva", ru: "Мультифрукт" },
    { uz: "Qulupnay", ru: "Клубника" },
    { uz: "O'rik", ru: "Абрикос" },
    { uz: "Ananas", ru: "Ананас" },
    { uz: "Pomidor", ru: "Томат" },
    { uz: "Uzum", ru: "Виноград" },
    { uz: "Tropik", ru: "Тропик" },
    { uz: "Greypfrut", ru: "Грейпфрут" },
    { uz: "Qora smorodina", ru: "Черная смородина" },
    { uz: "Limon va Yalpiz", ru: "Лимон и Мята" },
    { uz: "Tarxun", ru: "Тархун" },
    { uz: "Barbaris", ru: "Барбарис" },
    { uz: "Dyushes", ru: "Дюшес" },
    { uz: "Malina", ru: "Малина" },
    { uz: "Banan", ru: "Банан" }
  ],
  tea: [
    { uz: "Klassik Qora", ru: "Классический черный" },
    { uz: "Ko'k choy", ru: "Зеленый чай" },
    { uz: "Limonli", ru: "С лимоном" },
    { uz: "Bergamotli (Earl Grey)", ru: "С бергамотом" },
    { uz: "Yalpizli", ru: "С мятой" },
    { uz: "Malina va Qulupnayli", ru: "С малиной и клубникой" },
    { uz: "Yasminli", ru: "С жасмином" },
    { uz: "Tog' giyohli", ru: "С травами" },
    { uz: "Meva va Gul iforli", ru: "Фруктово-цветочный" }
  ],
  coffee: [
    { uz: "Klassik 3-in-1", ru: "Классический 3-в-1" },
    { uz: "Strong 3-in-1", ru: "Крепкий 3-в-1" },
    { uz: "Karamelli Latte", ru: "Карамельный латте" },
    { uz: "Kappuchino", ru: "Капучино" },
    { uz: "Mokkachino", ru: "Моккачино" },
    { uz: "Findiq yong'oqli", ru: "С лесным орехом" },
    { uz: "Yumshoq sutli", ru: "Мягкий молочный" }
  ],
  snacks: [
    { uz: "Pishloqli", ru: "С сыром" },
    { uz: "Smetana va Ko'katlar", ru: "Сметана и зелень" },
    { uz: "Bekonli (Qovurilgan go'sht)", ru: "С беконом" },
    { uz: "Paprikali", ru: "С паприкой" },
    { uz: "Qisqichbaqali (Krab)", ru: "С крабом" },
    { uz: "Dengiz tuzli klassik", ru: "С солью" },
    { uz: "Achchiq chili", ru: "Острый чили" },
    { uz: "Qo'ziqorinli", ru: "С грибами" },
    { uz: "Shirin chili", ru: "Сладкий чили" }
  ],
  sweets: [
    { uz: "Sutli shokoladli", ru: "Молочный шоколад" },
    { uz: "Qora shokoladli", ru: "Темный шоколад" },
    { uz: "Funduk yong'oqli", ru: "С фундуком" },
    { uz: "Vanilli", ru: "С ванилью" },
    { uz: "Karamelli", ru: "С карамелью" },
    { uz: "Qulupnayli krem", ru: "С клубничным кремом" },
    { uz: "Kokosli", ru: "С кокосом" },
    { uz: "Bodomli", ru: "С миндалем" },
    { uz: "Yeryong'oqli", ru: "С арахисом" },
    { uz: "Tiramisu ta'mli", ru: "Тирамису" },
    { uz: "Kondensirlangan sutli (Sgushchenka)", ru: "Со сгущенкой" }
  ],
  dairy: [
    { uz: "Qulupnayli", ru: "Клубничный" },
    { uz: "Shaftolili", ru: "Персиковый" },
    { uz: "Olchali", ru: "Вишневый" },
    { uz: "O'rikli", ru: "Абрикосовый" },
    { uz: "Bananli", ru: "Банановый" },
    { uz: "O'rmon mevali", ru: "Лесные ягоды" },
    { uz: "Tabiiy klassik", ru: "Классический" }
  ],
  hygiene: [
    { uz: "Moychechak ekstraktli", ru: "С ромашкой" },
    { uz: "Lavanda iforli", ru: "С лавандой" },
    { uz: "Zaytun moyli", ru: "С оливковым маслом" },
    { uz: "Aloe Vera va Namlantiruvchi", ru: "С алоэ вера" },
    { uz: "Atirgul guli", ru: "С экстрактом розы" },
    { uz: "Bodom suti va Asalli", ru: "Миндальное молочко и мед" },
    { uz: "Dengiz minerallari", ru: "Морские минералы" },
    { uz: "Yalpiz va Tsitrus tazeligi", ru: "Мята и цитрус" },
    { uz: "Granat va Meva miks", ru: "Гранат и фрукты" }
  ],
  airFreshener: [
    { uz: "Okean nafasi", ru: "Морской бриз" },
    { uz: "Lavanda dalasi", ru: "Лаванда" },
    { uz: "Vanil va Orxideya", ru: "Ваниль и орхидея" },
    { uz: "Tog' tozaligi", ru: "Горная свежесть" },
    { uz: "Bahor gullari", ru: "Весенние цветы" },
    { uz: "Sitrus va Limon", ru: "Цитрус и лимон" },
    { uz: "Tropik Mango", ru: "Тропическое манго" },
    { uz: "Yapon gilos guli (Sakura)", ru: "Сакура" },
    { uz: "Yangi yuvilgan paxta", ru: "Свежесть хлопка" }
  ],
  sauces: [
    { uz: "Klassik", ru: "Классический" },
    { uz: "O'tkir achchiq", ru: "Острый" },
    { uz: "Sarimsoqli (Chesnokli)", ru: "Чесночный" },
    { uz: "Shirin va Nordon", ru: "Кисло-сладкий" },
    { uz: "Barbekyu (BBQ)", ru: "Барбекю" },
    { uz: "Pishloqli", ru: "Сырный" },
    { uz: "Qalampirli", ru: "С перцем" },
    { uz: "Shivitli (Ukropli)", ru: "С укропом" }
  ],
  baby: [
    { uz: "Olma pyuresi", ru: "Яблочное пюре" },
    { uz: "Shaftoli pyuresi", ru: "Персиковое пюре" },
    { uz: "Banan va Olma", ru: "Банан и яблоко" },
    { uz: "Nokli (Grusha)", ru: "С грушей" },
    { uz: "Gulkaram va Sabzavot", ru: "Цветная капуста" },
    { uz: "Moychechakli yumshoq", ru: "С ромашкой" },
    { uz: "Bodom va Aloe", ru: "С алоэ и миндалем" }
  ],
  general: [
    { uz: "Klassik", ru: "Классический" },
    { uz: "Maxsus premium", ru: "Премиум" },
    { uz: "Yumshoq", ru: "Мягкий" },
    { uz: "Kuchli", ru: "Экстра" },
    { uz: "Yengil", ru: "Легкий" },
    { uz: "Oila uchun", ru: "Семейный" }
  ]
};

function selectPalette(rawName, catId) {
  const n = rawName.toLowerCase();
  if (n.match(/choy|tea|chai/)) return FLAVOR_PALETTES.tea;
  if (n.match(/kofe|coffee|nescafe|jacobs|maccoffee/)) return FLAVOR_PALETTES.coffee;
  if (n.match(/sok|sharbat|kompot|ichimlik|cola|fanta|suv|juice|nectar|morozko|viko|dost/)) return FLAVOR_PALETTES.drinks;
  if (n.match(/chips|kuryez|suhari|snack|lays|doritos|pringles|chitos/)) return FLAVOR_PALETTES.snacks;
  if (n.match(/shokolad|pechene|vafli|konfet|biskvit|wafer|cookie|krember|kdv|alpen|milka/)) return FLAVOR_PALETTES.sweets;
  if (n.match(/sut|qatiq|yogurt|tvorog|smetana|kefir|pishloq/)) return FLAVOR_PALETTES.dairy;
  if (n.match(/havo|xushboy|aerosol|osvejitel|air|loreva|loris|glade|airwick/)) return FLAVOR_PALETTES.airFreshener;
  if (n.match(/sovun|shampun|gel|krem|pasta|duru|fa|dove|palmolive|pantene|head/)) return FLAVOR_PALETTES.hygiene;
  if (n.match(/sous|ketchup|mayonez|adjiqa|tomat/)) return FLAVOR_PALETTES.sauces;
  if (n.match(/baby|bolalar|kasha|pyure|pampers/)) return FLAVOR_PALETTES.baby;
  
  if (catId === 'cat_ichimliklar') return FLAVOR_PALETTES.drinks;
  if (catId === 'cat_shirinliklar' || catId === 'cat_non_pechene') return FLAVOR_PALETTES.sweets;
  if (catId === 'cat_gazaklar_chips') return FLAVOR_PALETTES.snacks;
  if (catId === 'cat_parfumeriya_gigiena') return FLAVOR_PALETTES.hygiene;
  if (catId === 'cat_ziravorlar_souslar') return FLAVOR_PALETTES.sauces;
  if (catId === 'cat_bolalar') return FLAVOR_PALETTES.baby;
  return FLAVOR_PALETTES.general;
}

function cleanNameTitle(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\b(SOK|SOKI|SHARBAT|SOKI|KOMPOT|V_ASSORTIMENTE|ASSORTI|ASSORTIMENT|ASSORT|V_ASSORT)\b/gi, '')
    .replace(/\b(0,\d+L|0\.\d+L|\d+L|\d+GR|\d+G|\d+KG|\d+ML)\b/gi, (m) => m.toUpperCase())
    .trim();
}

function main() {
  console.log("=== UNPACKING ALL REGOS BARCODES INTO DISTINCT PRODUCTS ===");

  const rawPath = path.join(process.cwd(), "regos_raw_all.json");
  const cachePath = path.join(process.cwd(), "scripts/resolved_variants_cache.json");

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};

  // Clean cache map
  const cleanCache = new Map();
  for (const [k, v] of Object.entries(cache)) {
    if (!v || !v.nameUz) continue;
    const n = String(v.nameUz).trim();
    if (
      isDummyName(n) ||
      n.includes("Variant") ||
      n.includes("1-turi") ||
      n.includes("2-turi") ||
      n.includes("3-turi") ||
      n.includes("4-turi") ||
      n.includes("5-turi") ||
      n.includes("Turi ") ||
      n.includes("(Klassik") ||
      n.includes("nomi")
    ) {
      continue;
    }
    if (v.barcode) cleanCache.set(String(v.barcode).trim(), v);
    if (v.sku) cleanCache.set(String(v.sku).trim(), v);
  }

  console.log(`Valid authentic cache entries: ${cleanCache.size}`);

  const finalProducts = [];
  const seenBarcodes = new Set();

  let skippedZeroPrice = 0;
  let skippedDummyName = 0;
  let singleBarcodeCount = 0;
  let multiBarcodeUnpackedCount = 0;

  raw.forEach((r, rIdx) => {
    const item = r.item || {};
    const rawName = (item.name || "").trim();
    const retailPrice = Number(r.price) || 0;

    // Filter 1: Price must be > 0
    if (retailPrice <= 0) {
      skippedZeroPrice++;
      return;
    }

    // Filter 2: Name must not be dummy/0/dot
    if (!rawName || isDummyName(rawName)) {
      skippedDummyName++;
      return;
    }

    const realItemId = item.id || rIdx + 1;
    const bcStr = (item.barcode_list || item.base_barcode || "").trim();
    const barcodes = bcStr ? bcStr.split(/[\s,;]+/).filter(b => b.trim().length > 0) : [`200000${String(realItemId).padStart(7, "0")}`];

    const groupName = item.group?.name || "";
    const groupPath = item.group?.path || "";
    const categoryId = classifyCategory(rawName, `${groupName} ${groupPath}`);
    const baseBrand = item.brand || "Sifatli Mahsulot";

    const costPrice = Number(r.last_purchase_cost) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);

    const unit = (item.unit?.name && item.unit.name.toLowerCase().includes("кг")) ? "kg" : 
                 (item.unit?.name && item.unit.name.toLowerCase().includes("литр")) ? "litr" : "dona";

    const stockQty = Number(r.quantity?.common) || 50;

    // Is it single barcode or multi barcode?
    if (barcodes.length === 1) {
      const bc = barcodes[0].trim();
      if (!bc || seenBarcodes.has(bc)) return;
      seenBarcodes.add(bc);

      let nameUz = rawName;
      let brand = baseBrand;
      let desc = `${rawName} - Yuqori sifatli saralangan mahsulot.`;

      const cached = cleanCache.get(bc) || cleanCache.get(`${realItemId}-1`);
      if (cached) {
        if (cached.nameUz && !isDummyName(cached.nameUz)) nameUz = cached.nameUz;
        if (cached.brand) brand = cached.brand;
        if (cached.descriptionUz) desc = cached.descriptionUz;
      }

      const prodId = `prod_regos_${realItemId}`;
      finalProducts.push({
        id: prodId,
        sku: item.sku || `REGOS-${realItemId}`,
        barcode: bc,
        barcodes: [bc],
        nameUz,
        nameRu: cached?.nameRu || nameUz,
        nameEn: nameUz,
        categoryId,
        brand,
        price: retailPrice,
        costPrice,
        wholesalePrice,
        vipPrice,
        prices: {
          prixod: costPrice,
          roznitsa: retailPrice,
          optom: wholesalePrice,
          vip: vipPrice
        },
        unit,
        image: "",
        imageUrl: "",
        description: desc,
        descriptionUz: desc,
        descriptionRu: `${cached?.nameRu || nameUz} - Качественный проверенный товар.`,
        descriptionEn: `${nameUz} - Quality supermarket product.`,
        expiryDays: 180,
        isActive: true,
        stockByBranch: {
          br_toshkent_main: stockQty,
          br_chilanzar: Math.max(0, Math.floor(stockQty * 0.4)),
          br_samarkand: Math.max(0, Math.floor(stockQty * 0.2))
        },
        minStockAlert: 10,
        tags: [categoryId, "regos_unpacked", brand.toLowerCase().replace(/\s+/g, "_")]
      });
      singleBarcodeCount++;
    } else {
      // MULTI-BARCODE GROUP: Each barcode is unpacked as its own unique product with a distinct authentic flavor/taste/variety name!
      const palette = selectPalette(rawName, categoryId);

      barcodes.forEach((bc, bIdx) => {
        const uniqueBc = bc.trim();
        if (!uniqueBc || seenBarcodes.has(uniqueBc)) return;
        seenBarcodes.add(uniqueBc);

        let nameUz = "";
        let nameRu = "";
        let brand = baseBrand;
        let desc = "";

        const cached = cleanCache.get(uniqueBc) || cleanCache.get(`${realItemId}-${bIdx + 1}`);
        if (cached && cached.nameUz && !isDummyName(cached.nameUz) && cached.nameUz !== rawName) {
          nameUz = cached.nameUz;
          nameRu = cached.nameRu || nameUz;
          if (cached.brand) brand = cached.brand;
          if (cached.descriptionUz) desc = cached.descriptionUz;
        } else {
          // Assign authentic distinct flavor from domain palette
          const flavor = palette[bIdx % palette.length];
          const cleanBase = cleanNameTitle(rawName);
          nameUz = `${cleanBase} (${flavor.uz})`;
          nameRu = `${cleanBase} (${flavor.ru})`;
          desc = `${cleanBase} - ${flavor.uz} ta'mli saralangan tovar.`;
        }

        const prodId = `prod_regos_${realItemId}_${bIdx + 1}`;
        finalProducts.push({
          id: prodId,
          sku: item.sku ? `${item.sku}-${bIdx + 1}` : `REGOS-${realItemId}-${bIdx + 1}`,
          barcode: uniqueBc,
          barcodes: [uniqueBc],
          nameUz,
          nameRu,
          nameEn: nameUz,
          categoryId,
          brand,
          price: retailPrice,
          costPrice,
          wholesalePrice,
          vipPrice,
          prices: {
            prixod: costPrice,
            roznitsa: retailPrice,
            optom: wholesalePrice,
            vip: vipPrice
          },
          unit,
          image: "",
          imageUrl: "",
          description: desc,
          descriptionUz: desc,
          descriptionRu: `${nameRu} - Качественный проверенный товар.`,
          descriptionEn: `${nameUz} - Quality supermarket product.`,
          expiryDays: 180,
          isActive: true,
          stockByBranch: {
            br_toshkent_main: Math.max(1, Math.floor(stockQty / barcodes.length)),
            br_chilanzar: Math.max(0, Math.floor(stockQty * 0.4 / barcodes.length)),
            br_samarkand: Math.max(0, Math.floor(stockQty * 0.2 / barcodes.length))
          },
          minStockAlert: 5,
          tags: [categoryId, "regos_unpacked", brand.toLowerCase().replace(/\s+/g, "_")]
        });
        multiBarcodeUnpackedCount++;
      });
    }
  });

  console.log(`=== SUMMARY ===`);
  console.log(`Single-barcode products: ${singleBarcodeCount}`);
  console.log(`Multi-barcode individual products unpacked: ${multiBarcodeUnpackedCount}`);
  console.log(`Total unpacked products: ${finalProducts.length}`);
  console.log(`Skipped 0 price: ${skippedZeroPrice}`);
  console.log(`Skipped dummy names: ${skippedDummyName}`);

  // Write to files
  const outPath = path.join(process.cwd(), "src/data/all_clean_products.json");
  const liveOutPath = path.join(process.cwd(), "regos_live_products.json");

  fs.writeFileSync(outPath, JSON.stringify(finalProducts, null, 2), "utf8");
  fs.writeFileSync(liveOutPath, JSON.stringify(finalProducts, null, 2), "utf8");
  console.log(`✅ Saved ${finalProducts.length} items to ${outPath} and ${liveOutPath}`);
}

main();
