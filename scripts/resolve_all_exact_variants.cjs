const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function runResolution() {
  console.log("=== STARTING EXACT VARIANT RESOLUTION PIPELINE ===");

  const groupsFile = "scripts/groups_to_resolve.json";
  if (!fs.existsSync(groupsFile)) {
    console.error("Groups file not found!");
    return;
  }

  const allGroups = JSON.parse(fs.readFileSync(groupsFile, "utf8"));
  console.log(`Total groups to resolve: ${allGroups.length}`);

  const resolvedMap = new Map();
  const cacheFile = "scripts/resolved_variants_cache.json";
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      Object.entries(cached).forEach(([k, v]) => {
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
          resolvedMap.set(k, v);
          if (v.barcode) resolvedMap.set(v.barcode.trim(), v);
          if (v.sku) resolvedMap.set(v.sku.trim(), v);
        }
      });
      console.log(`Loaded ${resolvedMap.size} items from cache`);
    } catch (e) {
      console.warn("Could not read cache:", e.message);
    }
  }

  const saveCache = () => {
    const cacheObj = {};
    resolvedMap.forEach((v, k) => { cacheObj[k] = v; });
    fs.writeFileSync(cacheFile, JSON.stringify(cacheObj, null, 2));
  };

  // Filter groups that still have unresolved items
  const pendingGroups = allGroups.filter(g => {
    return g.items.some(item => !resolvedMap.has(item.sku) && !resolvedMap.has(item.barcode));
  });

  console.log(`Pending groups to process: ${pendingGroups.length}`);

  const BATCH_SIZE = 15;
  const chunks = [];
  for (let i = 0; i < pendingGroups.length; i += BATCH_SIZE) {
    chunks.push(pendingGroups.slice(i, i + BATCH_SIZE));
  }

  console.log(`Total chunks: ${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    const batch = chunks[i];
    console.log(`--> Processing chunk ${i + 1} / ${chunks.length} (${batch.length} groups)...`);

    const simplifiedBatch = batch.map(g => ({
      originalName: g.originalName,
      groupCategory: g.group,
      items: g.items.map(it => ({ sku: it.sku, barcode: it.barcode }))
    }));

    const prompt = `Siz O'zbekiston supermarketlaridagi tovarlar bo'yicha mutaxassis katalogchisiz.
Quyida Regos tizimidagi tovar guruhi va unga biriktirilgan bir nechta shtrix-kodlar ro'yxati berilgan.
Har bir shtrix-kod uchun haqiqiy, aniq tovar nomini (ta'mi, meva/hid turi, modeli, hajmi) aniqlang.

QAT'IY QOIDALAR:
1. Hech qachon "1-turi", "2-turi", "Variant 1", "Variant 2", "Assorti", "Klassik (Variant X)" kabi sun'iy yoki noaniq so'zlar ishlatmang!
2. Har bir shtrix-kodga haqiqiy tovar nomini bering (masalan: Olma, Shaftoli, Apelsin, Olcha, Anor, Shokolad, Vanil, Qulupnay, Pishloq, Qisqichbaqa, Malibu, va h.k.).
3. Nomi chiroyli lotin alifbosida o'zbek tilida va to'g'ri rus tilida bo'lsin.
4. Har bir elementda berilgan sku va barcode ni aynan saqlang!

Kirish ma'lumotlari:
${JSON.stringify(simplifiedBatch, null, 2)}

Javobni quyidagi formatdagi qat'iy JSON massivi sifatida qaytaring:
[
  {
    "sku": "aniq sku (masalan 4-1)",
    "barcode": "shtrix-kod",
    "nameUz": "Aniq tovar nomi o'zbekcha (masalan: Vostochniy Sad Olcha kompoti 1L)",
    "nameRu": "Aniq tovar nomi ruscha (masalan: Компот Восточный Сад Вишня 1л стекло)",
    "flavorUz": "Ta'mi/Turi (masalan: Olcha)",
    "brand": "Brend nomi",
    "category": "Kategoriya nomi",
    "descriptionUz": "Bir jumlali to'liq tavsif"
  }
]`;

    let retries = 3;
    while (retries > 0) {
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
              if (it.sku) resolvedMap.set(it.sku, it);
              if (it.barcode) resolvedMap.set(it.barcode, it);
            }
          });
        }
        break;
      } catch (err) {
        console.warn(`Chunk ${i + 1} attempt failed: ${err.message}. Retrying in 2s...`);
        retries--;
        await sleep(2000);
      }
    }

    saveCache();
    console.log(`Progress: ${resolvedMap.size} items resolved in cache.`);
    await sleep(800);
  }

  saveCache();
  console.log("=== ALL BATCHES RESOLVED SUCCESSFULLY ===");
}

runResolution().catch(console.error);
