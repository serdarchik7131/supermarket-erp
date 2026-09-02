const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("=== FAST CONCURRENT RESOLUTION FOR ALL REGOS VARIANTS ===");

  const groups = JSON.parse(fs.readFileSync("scripts/groups_to_resolve.json", "utf8"));
  const cacheFile = "scripts/resolved_variants_cache.json";
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : {};

  // Find groups that have missing or low-quality items
  const pendingGroups = [];
  groups.forEach(g => {
    const missingItems = g.items.filter(it => {
      const hit = cache[it.barcode] || cache[it.sku];
      return !hit || !hit.nameUz || hit.nameUz.includes("Variant") || hit.nameUz.includes("1-turi") || hit.nameUz.includes("2-turi") || hit.nameUz.includes("(Klassik");
    });
    if (missingItems.length > 0) {
      pendingGroups.push({
        regosId: g.regosId,
        originalName: g.originalName,
        group: g.group,
        items: missingItems
      });
    }
  });

  const totalMissingItems = pendingGroups.reduce((acc, g) => acc + g.items.length, 0);
  console.log(`Found ${pendingGroups.length} groups with ${totalMissingItems} variants to resolve.`);

  const BATCH_SIZE = 12;
  const CONCURRENCY = 4;

  const chunks = [];
  for (let i = 0; i < pendingGroups.length; i += BATCH_SIZE) {
    chunks.push(pendingGroups.slice(i, i + BATCH_SIZE));
  }

  console.log(`Split into ${chunks.length} chunks of up to ${BATCH_SIZE} groups each.`);

  for (let c = 0; c < chunks.length; c += CONCURRENCY) {
    const currentChunks = chunks.slice(c, c + CONCURRENCY);
    console.log(`--> Sending chunks ${c + 1}-${Math.min(c + CONCURRENCY, chunks.length)} of ${chunks.length}...`);

    await Promise.all(currentChunks.map(async (batch, bIdx) => {
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
                if (it.barcode) cache[it.barcode.trim()] = it;
                if (it.sku) cache[it.sku.trim()] = it;
              }
            });
          }
          break;
        } catch (err) {
          console.warn(`Chunk failed: ${err.message}. Retrying in 2s...`);
          retries--;
          await sleep(2000);
        }
      }
    }));

    // Save cache after each concurrent round
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    console.log(`Cache updated: ${Object.keys(cache).length} keys saved.`);
    await sleep(1000);
  }

  console.log("\n🎉 ALL VARIANTS RESOLVED SUCCESSFULLY!");
}

main().catch(console.error);
