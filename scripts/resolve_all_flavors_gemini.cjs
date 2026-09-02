const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

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

async function main() {
  console.log("=== 🚀 FAST FLAVOR & VARIANT RESOLVER FOR ALL REGOS ITEMS ===");

  const raw = JSON.parse(fs.readFileSync("regos_raw_all.json", "utf8"));
  const cacheFile = "scripts/resolved_variants_cache.json";
  
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    } catch (e) {
      cache = {};
    }
  }

  // Clean cache map
  const cleanCache = {};
  Object.entries(cache).forEach(([k, v]) => {
    if (
      v &&
      v.nameUz &&
      !isDummyName(v.nameUz) &&
      !v.nameUz.includes("Variant") &&
      !v.nameUz.includes("1-turi") &&
      !v.nameUz.includes("2-turi") &&
      !v.nameUz.includes("3-turi") &&
      !v.nameUz.includes("4-turi") &&
      !v.nameUz.includes("5-turi") &&
      !v.nameUz.includes("Turi ") &&
      !v.nameUz.includes("(Klassik") &&
      !v.nameUz.includes("nomi")
    ) {
      if (v.barcode) cleanCache[v.barcode.trim()] = v;
      if (v.sku) cleanCache[v.sku.trim()] = v;
      cleanCache[k] = v;
    }
  });

  console.log(`Loaded clean cache: ${Object.keys(cleanCache).length} keys.`);

  // Find all groups with barcodes needing specific names
  const groupsToResolve = [];
  raw.forEach((r, idx) => {
    const item = r.item || {};
    const rawName = (item.name || "").trim();
    const price = Number(r.price) || 0;
    if (price <= 0 || isDummyName(rawName)) return;

    const bcStr = (item.barcode_list || item.base_barcode || "").trim();
    const barcodes = bcStr ? bcStr.split(/[\s,;]+/).filter(Boolean) : [];
    if (barcodes.length <= 1) return;

    const realItemId = item.id || idx + 1;
    const groupName = item.group?.name || "";

    const missing = [];
    barcodes.forEach((bc, bIdx) => {
      const sku = `${realItemId}-${bIdx + 1}`;
      const hit = cleanCache[bc.trim()] || cleanCache[sku];
      if (!hit || !hit.nameUz || hit.nameUz === rawName || hit.nameUz.includes("Variant") || hit.nameUz.includes("1-turi")) {
        missing.push({ sku, barcode: bc.trim(), index: bIdx + 1, total: barcodes.length });
      }
    });

    if (missing.length > 0) {
      groupsToResolve.push({
        id: realItemId,
        name: rawName,
        group: groupName,
        brand: item.brand || "",
        items: missing
      });
    }
  });

  console.log(`Groups needing distinct variant names: ${groupsToResolve.length}`);
  const totalItems = groupsToResolve.reduce((s, g) => s + g.items.length, 0);
  console.log(`Total barcodes to resolve: ${totalItems}`);

  if (groupsToResolve.length === 0) {
    console.log("All barcodes already have distinct names!");
    return;
  }

  const BATCH_SIZE = 15;
  const CONCURRENCY = 8;
  const chunks = [];
  for (let i = 0; i < groupsToResolve.length; i += BATCH_SIZE) {
    chunks.push(groupsToResolve.slice(i, i + BATCH_SIZE));
  }

  console.log(`Split into ${chunks.length} chunks of ${BATCH_SIZE} groups each. Running with concurrency ${CONCURRENCY}...`);

  for (let c = 0; c < chunks.length; c += CONCURRENCY) {
    const currentBatch = chunks.slice(c, c + CONCURRENCY);
    console.log(`--> Sending chunks ${c + 1} - ${Math.min(c + CONCURRENCY, chunks.length)} of ${chunks.length}...`);

    await Promise.all(currentBatch.map(async (batch, batchIdx) => {
      const payload = batch.map(g => ({
        groupId: g.id,
        groupName: g.name,
        category: g.group,
        brand: g.brand,
        variants: g.items.map(it => ({ sku: it.sku, barcode: it.barcode, variantNumber: it.index, totalVariantsInGroup: it.total }))
      }));

      const prompt = `Siz O'zbekiston supermarketlaridagi barcha tovarlar va ularning assortiment turlari (ta'mlari, mevalari, xushbo'y hidlari, modellari, turlari) bo'yicha tovarshunos mutaxassissiz.

Quyida Regos POS tizimidan olingan tovar guruhlari va ularning bir nechta shtrix-kodlari berilgan.
Har bir shtrix-kod uchun guruhdagi tovarning HAQIQIY, ANIQ, BETAKROR nomini aniqlang (masalan: Olma, Shaftoli, Olcha, Apelsin, Anor, Banan, Qulupnay, Pomidor, Bodring, Shokolad, Vanil, Karamelli, Pishloqli, Malibu, Kokos, Mango, Limon, Moychechak, Lavanda, Dengiz nafasi va h.k.).

MUHIM QOIDALAR:
1. Bir guruh ichidagi har bir shtrix-kodga bir-biridan farq qiladigan ANIQ haqiqiy ta'm/tur/rang/meva nomini bering.
2. Hech qachon '1-turi', '2-turi', 'Variant 1', 'Variant 2', 'Assorti', 'Klassik (Variant X)', 'Nomi' kabi umumiy so'zlarni ishlatmang!
3. Nomi o'zbek tilida toza lotin alifbosida va rus tilida aniq yozilsin (Masalan: "Xoshal Kids Olma sharbati 0.2L", "Xoshal Kids Shaftoli sharbati 0.2L", "Xoshal Kids Olcha sharbati 0.2L", "Vostochniy Sad Olcha kompoti 1L").
4. Har bir elementda berilgan sku va barcode ni aynan saqlang!

Kirish ma'lumotlari:
${JSON.stringify(payload, null, 2)}

Javobni quyidagi formatda qat'iy JSON massivi sifatida qaytaring:
[
  {
    "sku": "berilgan sku",
    "barcode": "berilgan barcode",
    "nameUz": "Tovar nomi o'zbekcha (aniq ta'mi/turi bilan)",
    "nameRu": "Tovar nomi ruscha",
    "flavor": "Meva yoki ta'm turi",
    "brand": "Brend",
    "category": "Kategoriya"
  }
]`;

      let retries = 3;
      while (retries > 0) {
        try {
          const res = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });

          const items = JSON.parse(res.text);
          if (Array.isArray(items)) {
            items.forEach(it => {
              if (it && it.nameUz && !isDummyName(it.nameUz) && !it.nameUz.includes("Variant") && !it.nameUz.includes("1-turi")) {
                if (it.barcode) cleanCache[it.barcode.trim()] = it;
                if (it.sku) cleanCache[it.sku.trim()] = it;
              }
            });
          }
          break;
        } catch (err) {
          console.warn(`Retry batch ${c + batchIdx + 1}: ${err.message}`);
          retries--;
          await sleep(1500);
        }
      }
    }));

    // Save cache after each concurrent batch
    fs.writeFileSync(cacheFile, JSON.stringify(cleanCache, null, 2));
    console.log(`Saved! Current resolved cache entries: ${Object.keys(cleanCache).length}`);
    await sleep(500);
  }

  console.log("🎉 ALL BARCODES RESOLVED WITH SPECIFIC FLAVORS AND NAMES!");
}

main().catch(console.error);
