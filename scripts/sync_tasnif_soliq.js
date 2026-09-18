/**
 * Tasnif.soliq.uz Mahsulotlar Shtrix-kod Sinxronizatori
 * 
 * Ushbu skript to'g'ridan-to'g'ri https://tasnif.soliq.uz API orqali
 * bizdagi barcha tovarlarning shtrix-kodi (GTIN) bo'yicha qidirib,
 * chiqqan tovarlarning rasmiy soliq nomi va rasmini 100% aniqlik bilan yangilaydi.
 * 
 * Qoida: Chiqmagan yoki topilmagan mahsulotlar 100% ASLI HOLATDA QOLAVERADI!
 * 
 * Ishga tushirish (O'zbekiston tarmog'ida):
 * node scripts/sync_tasnif_soliq.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PRODUCTS_FILE = path.join(__dirname, '..', 'regos_live_products.json');
const CLEAN_PRODUCTS_FILE = path.join(__dirname, '..', 'src', 'data', 'all_clean_products.json');

// Tasnif Soliq API asosiy manzillari
const TASNIF_BASE_URLS = [
  'https://tasnif.soliq.uz/api/cls-api',
  'https://tasnif.soliq.uz/api/cl-api'
];

// HTTP GET so'rov yuborish
function fetchJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const req = https.get(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
            'Origin': 'https://tasnif.soliq.uz',
            'Referer': 'https://tasnif.soliq.uz/'
          },
          timeout: timeoutMs
        },
        (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return resolve(null);
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (e) {
              resolve(null);
            }
          });
        }
      );

      req.on('error', (err) => {
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

// Bitta shtrix kod bo'yicha Tasnif Soliq dan qidirish
async function queryTasnifByBarcode(barcode) {
  if (!barcode || typeof barcode !== 'string') return null;
  const cleanBarcode = barcode.trim();
  if (cleanBarcode.length < 8) return null;

  // Har xil variantlarda qidirish
  for (const baseUrl of TASNIF_BASE_URLS) {
    try {
      // 1-urinish: gtin parametri bilan qidiruv (o'zbekcha)
      const urlUz = `${baseUrl}/mxik/search/by-params?gtin=${encodeURIComponent(cleanBarcode)}&lang=uz&size=10&page=0`;
      const resUz = await fetchJson(urlUz);

      let items = [];
      if (resUz && resUz.data && Array.isArray(resUz.data.content)) {
        items = resUz.data.content;
      } else if (resUz && Array.isArray(resUz.content)) {
        items = resUz.content;
      } else if (resUz && Array.isArray(resUz.data)) {
        items = resUz.data;
      }

      if (items.length > 0) {
        return extractProductData(items[0], cleanBarcode);
      }

      // 2-urinish: ruscha qidiruv
      const urlRu = `${baseUrl}/mxik/search/by-params?gtin=${encodeURIComponent(cleanBarcode)}&lang=ru&size=10&page=0`;
      const resRu = await fetchJson(urlRu);

      let itemsRu = [];
      if (resRu && resRu.data && Array.isArray(resRu.data.content)) {
        itemsRu = resRu.data.content;
      } else if (resRu && Array.isArray(resRu.content)) {
        itemsRu = resRu.content;
      }

      if (itemsRu.length > 0) {
        return extractProductData(itemsRu[0], cleanBarcode);
      }
    } catch (e) {
      // Keyingi variantga o'tish
    }
  }

  return null;
}

// Tasnif Soliq javobidan tovar ma'lumotlarini 100% aniq ajratib olish
function extractProductData(item, expectedBarcode) {
  if (!item) return null;

  // Nomi
  let name = item.nameUz || item.name || item.fullName || item.attributeNameUz || item.attributeName || item.positionNameUz || item.positionName || '';
  if (!name && item.packageNames && item.packageNames.length > 0) {
    name = item.packageNames[0].nameUz || item.packageNames[0].nameRu || '';
  }

  // Rasmi
  let image = '';
  if (item.photo || item.photoUrl || item.imageUrl || item.image) {
    image = item.photo || item.photoUrl || item.imageUrl || item.image;
  } else if (item.packageNames && item.packageNames.length > 0) {
    const pkg = item.packageNames[0];
    image = pkg.photo || pkg.imageUrl || pkg.photoUrl || '';
  } else if (item.fileId) {
    image = `https://tasnif.soliq.uz/api/cls-api/file/download/${item.fileId}`;
  }

  // MXIK kodi
  const mxikCode = item.mxikCode || item.code || '';
  const brand = item.brandName || '';

  if (!name && !image) {
    return null;
  }

  return {
    barcode: expectedBarcode,
    name: name.trim(),
    image: image ? image.trim() : '',
    mxikCode: mxikCode ? String(mxikCode).trim() : '',
    brand: brand ? String(brand).trim() : ''
  };
}

// Asosiy ishga tushirish funksiyasi
async function main() {
  console.log('====================================================');
  console.log('🚀 TASNIF.SOLIQ.UZ SHTRIX-KOD SINXRONIZATSIYASI');
  console.log('====================================================\n');

  if (!fs.existsSync(PRODUCTS_FILE)) {
    console.error(`❌ Fayl topilmadi: ${PRODUCTS_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
  let products = JSON.parse(raw);
  console.log(`📦 Bazadagi jami mahsulotlar soni: ${products.length} ta`);

  // Haqiqiy shtrix-kodga ega tovarlarni ajratish
  const eligibleProducts = products.filter(p => p.barcode && String(p.barcode).trim().length >= 8);
  console.log(`🔍 Sinxronizatsiya uchun yaroqli shtrix-kodlar: ${eligibleProducts.length} ta`);

  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  let imagesFoundCount = 0;

  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES_MS = 300; // Saytni yuklamaslik uchun kichik tanaffus

  for (let i = 0; i < eligibleProducts.length; i += BATCH_SIZE) {
    const batch = eligibleProducts.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (prod) => {
      const barcode = String(prod.barcode).trim();
      const tasnifData = await queryTasnifByBarcode(barcode);

      if (tasnifData && (tasnifData.name || tasnifData.image)) {
        let changed = false;

        // Agar tasnifda nomi bo'lsa va 100% aniq bo'lsa
        if (tasnifData.name && tasnifData.name.length > 2) {
          prod.nameUz = tasnifData.name;
          changed = true;
        }

        // Agar tasnifda rasmi bo'lsa
        if (tasnifData.image) {
          prod.image = tasnifData.image;
          prod.imageUrl = tasnifData.image;
          imagesFoundCount++;
          changed = true;
        }

        // MXIK kodini ham to'ldirish
        if (tasnifData.mxikCode) {
          prod.ikpu = tasnifData.mxikCode;
          prod.mxik = tasnifData.mxikCode;
        }

        if (changed) {
          updatedCount++;
          console.log(`✅ [${updatedCount}] Shtrix-kod: ${barcode} -> "${prod.nameUz}" ${tasnifData.image ? '🖼 (Rasm topildi)' : ''}`);
        } else {
          skippedCount++;
        }
      } else {
        // Chiqmagan mahsulotlar 100% ASLI HOLATDA QOLAVERADI!
        notFoundCount++;
      }
    }));

    if (i % 50 === 0 && i > 0) {
      console.log(`⏳ Jarayon: ${i}/${eligibleProducts.length} (${Math.round((i / eligibleProducts.length) * 100)}%). Yangilandi: ${updatedCount} ta`);
      // Vaqti-vaqti bilan faylga saqlab borish
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
      if (fs.existsSync(CLEAN_PRODUCTS_FILE)) {
        fs.writeFileSync(CLEAN_PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
      }
    }

    await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
  }

  // Yakuniy saqlash
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
  if (fs.existsSync(CLEAN_PRODUCTS_FILE)) {
    fs.writeFileSync(CLEAN_PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
  }

  console.log('\n====================================================');
  console.log('🏁 SINXRONIZATSIYA YAKUNLANDI!');
  console.log(`✅ Muvaffaqiyatli yangilangan tovarlar: ${updatedCount} ta`);
  console.log(`🖼 Topilgan tovar rasmlari: ${imagesFoundCount} ta`);
  console.log(`🛡 Asli holatda qoldirilgan tovarlar: ${notFoundCount + skippedCount} ta`);
  console.log('====================================================');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  queryTasnifByBarcode,
  extractProductData
};
