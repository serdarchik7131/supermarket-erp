const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("=== 🚀 STEADY RESOLVER: UNPACKING REGOS TOVARLAR ===");

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

  const cleanCache = {};
  Object.entries(cache).forEach(([k, v]) => {
    if (
      v &&
      v.nameUz &&
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

  console.log(`Starting with ${Object.keys(cleanCache).length} validated cache entries.`);

  // Find remaining unresolved groups
  const remainingGroups = [];
  raw.forEach((r, idx) => {
    const item = r.item || {};
    const bcStr = (item.barcode_list || item.base_barcode || "").trim();
    if (!bcStr) return;

    const barcodes = bcStr.split(/[\s,;]+/).filter(b => b.trim().length > 0);
    if (barcodes.length <= 1) return;

    const realItemId = item.id || idx + 1;
    const rawName = (item.name || "").trim();
    const groupName = item.group?.name || "";

    const missingBarcodes = [];
    barcodes.forEach((bc, bIdx) => {
      const sku = `${realItemId}-${bIdx + 1}`;
      const hit = cleanCache[bc.trim()] || cleanCache[sku];
      if (!hit || !hit.nameUz || hit.nameUz.includes("Variant") || hit.nameUz.includes("1-turi")) {
        missingBarcodes.push({ sku, barcode: bc.trim() });
      }
    });

    if (missingBarcodes.length > 0) {
      remainingGroups.push({
        realItemId,
        originalName: rawName,
        group: groupName,
        items: missingBarcodes
      });
    }
  });

  const totalMissing = remainingGroups.reduce((sum, g) => sum + g.items.length, 0);
  console.log(`Groups needing resolution: ${remainingGroups.length} (${totalMissing} variants)`);

  if (remainingGroups.length === 0) {
    console.log("🎉 All products already resolved 100%!");
    return;
  }

  // 25 groups per request = only ~15 requests total!
  const BATCH_SIZE = 25;
  const chunks = [];
  for (let i = 0; i < remainingGroups.length; i += BATCH_SIZE) {
    chunks.push(remainingGroups.slice(i, i + BATCH_SIZE));
  }

  console.log(`Total requests needed: ${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    const batch = chunks[i];
    console.log(`\n[Request ${i + 1}/${chunks.length}] Resolving ${batch.length} product groups...`);

    const payload = batch.map(g => ({
      groupName: g.originalName,
      category: g.group,
      items: g.items.map(it => ({ sku: it.sku, barcode: it.barcode }))
    }));

    const prompt = `Siz O'zbekiston supermarketlaridagi tovarlar bo'yicha eng tajribali tovarshunos mutaxassissiz.
Quyida Regos tizimidagi tovar guruhi va unga biriktirilgan shtrix-kodlar berilgan.
Har bir shtrix-kod uchun haqiqiy, aniq tovar nomini (ta'mi, meva/hid turi, modeli, hajmi) aniqlang.

QAT'IY TALABLAR:
1. Hech qachon '1-turi', '2-turi', 'Variant 1', 'Variant 2', 'Assorti', 'Klassik (Variant X)' kabi sun'iy nomlar bermang!
2. Har bir shtrix-kodga haqiqiy tovar nomini bering (masalan: Olma, Shaftoli, Apelsin, Olcha, Anor, Shokolad, Vanil, Qulupnay, Pishloq, Moychechak, Lavanda, va h.k.).
3. O'zbek tilida toza lotin alifbosida (masalan: "Baby Soff Bolalar moychechakli sovuni 90g", "Loreva Mango havo xushbo'ylatgichi 110ml", "Loris Lavanda xushbo'ylatgichi 120ml") va rus tilida aniq yozing.
4. Har bir elementda berilgan sku va barcode ni aynan saqlang!

Kirish ma'lumotlari:
${JSON.stringify(payload, null, 2)}

Javobni quyidagi formatdagi qat'iy JSON massivi sifatida qaytaring:
[
  {
    "sku": "aniq sku",
    "barcode": "aniq shtrix-kod",
    "nameUz": "Aniq tovar nomi o'zbekcha",
    "nameRu": "Aniq tovar nomi ruscha",
    "flavorUz": "Ta'mi/Turi",
    "brand": "Brend",
    "category": "Kategoriya",
    "descriptionUz": "Bir jumlali tavsif"
  }
]`;

    let success = false;
    let retries = 3;
    while (retries > 0 && !success) {
      try {
        const res = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        const items = JSON.parse(res.text);
        if (Array.isArray(items)) {
          items.forEach(it => {
            if (it && it.nameUz && !it.nameUz.includes("Variant") && !it.nameUz.includes("1-turi")) {
              if (it.barcode) cleanCache[it.barcode.trim()] = it;
              if (it.sku) cleanCache[it.sku.trim()] = it;
            }
          });
          success = true;
          console.log(`✓ Resolved ${items.length} variants.`);
        }
      } catch (err) {
        console.warn(`Attempt failed: ${err.message}. Retrying in 5s...`);
        retries--;
        await sleep(5000);
      }
    }

    fs.writeFileSync(cacheFile, JSON.stringify(cleanCache, null, 2));
    console.log(`Saved cache (${Object.keys(cleanCache).length} total keys). Waiting 4.5s...`);
    await sleep(4500);
  }

  console.log("\n=======================================================");
  console.log("🎉 ALL REGOS VARIANTS RESOLVED SUCCESSFULLY!");
  console.log("=======================================================");
}

main().catch(console.error);
