const fs = require('fs');

const rawList = fs.existsSync('regos_raw_all.json') 
  ? JSON.parse(fs.readFileSync('regos_raw_all.json', 'utf8'))
  : [];

const rawMap = new Map();
rawList.forEach(r => {
  if (r.item && r.item.id) {
    rawMap.set(String(r.item.id), r);
  }
});

const currentProducts = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));

function cleanTitle(name, fallbackName) {
  let s = name || fallbackName || '';
  if (!s) return '';

  // 1. Remove fabricated variant / tur expressions
  s = s.replace(/\s*\(\s*(?:Klassik|Классик)?\s*\(?\s*(?:Variant|Вариант)\s*\d+\s*\)?\s*\)/gi, '');
  s = s.replace(/\s*\(\s*(?:Variant|Вариант)\s*\d+\s*\)/gi, '');
  s = s.replace(/\b(?:Variant|Вариант)\s*\d+\b/gi, '');
  s = s.replace(/\s*\(\s*\d+-(?:classic|klassik)?\s*tur\s*\)/gi, '');
  s = s.replace(/\s*\(\s*\d+-tur\s*\)/gi, '');
  s = s.replace(/\b\d+-(?:classic|klassik)\s*tur\b/gi, '');
  s = s.replace(/\b\d+-tur\b/gi, '');
  s = s.replace(/\s*\(\s*(?:Turi|Tur|Вид)\s*\d+\s*\)/gi, '');
  s = s.replace(/\s*\(\s*(?:Klassik|Классик)\s*\)/gi, '');

  // 2. Remove internal raw IDs in parentheses like (48), (4121)
  s = s.replace(/\s*\(\s*\d{2,6}\s*\)$/g, '');

  // 3. Clean empty parentheses and spacing
  s = s.replace(/\s*\(\s*\)/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  // 4. Normalize decimal commas (0,5L -> 0.5L, 1,5kg -> 1.5kg)
  s = s.replace(/(\d+),(\d+)/g, '$1.$2');

  // 5. Remove trailing commas or hyphens
  s = s.replace(/[,-]\s*$/, '').trim();

  // Fallback if empty
  if (!s || s.length < 2) {
    s = fallbackName ? fallbackName.trim() : 'Mahsulot';
  }

  return s;
}

const cleanedProductsMap = new Map();
let mergedDuplicatesCount = 0;
let modifiedNamesCount = 0;

currentProducts.forEach(p => {
  const match = p.id.match(/^prod_regos_(\d+)(?:_\d+)?$/);
  const baseId = match ? match[1] : p.id;
  const rawItem = rawMap.get(baseId);
  const rawName = rawItem && rawItem.item ? rawItem.item.name : '';

  const oldUz = p.nameUz || '';
  const cleanUz = cleanTitle(p.nameUz, rawName);
  const cleanRu = cleanTitle(p.nameRu, rawName) || cleanUz;
  const cleanEn = cleanTitle(p.nameEn, rawName) || cleanUz;

  if (oldUz !== cleanUz) {
    modifiedNamesCount++;
  }

  // Key by baseId and cleanUz (so genuine distinct flavors stay separate, but duplicate fake variants merge)
  const key = `${baseId}_${cleanUz.toLowerCase()}`;

  if (!cleanedProductsMap.has(key)) {
    const allBarcodes = [];
    if (p.barcode) allBarcodes.push(p.barcode);
    if (rawItem && rawItem.item && rawItem.item.barcode_list) {
      const rawBarcodes = rawItem.item.barcode_list.split(',').map(b => b.trim()).filter(Boolean);
      rawBarcodes.forEach(b => {
        if (!allBarcodes.includes(b)) allBarcodes.push(b);
      });
    }

    cleanedProductsMap.set(key, {
      ...p,
      id: match ? `prod_regos_${baseId}` : p.id,
      sku: match ? `REGOS-${baseId}` : p.sku,
      barcode: p.barcode || (allBarcodes[0] || ''),
      barcodes: allBarcodes,
      nameUz: cleanUz,
      nameRu: cleanRu,
      nameEn: cleanEn,
      description: `${cleanUz} - Yuqori sifatli, sertifikatlangan yangi mahsulot.`,
      descriptionUz: `${cleanUz} - Yuqori sifatli, sertifikatlangan yangi mahsulot.`,
      descriptionRu: `${cleanRu} - Сертифицированный качественный товар.`,
      descriptionEn: `${cleanEn} - Quality certified supermarket product.`,
    });
  } else {
    mergedDuplicatesCount++;
    const existing = cleanedProductsMap.get(key);
    if (p.barcode && !existing.barcodes.includes(p.barcode)) {
      existing.barcodes.push(p.barcode);
    }
  }
});

const finalizedProducts = Array.from(cleanedProductsMap.values());

console.log('📊 Cleaning Results:');
console.log('• Total input products:', currentProducts.length);
console.log('• Product names cleaned/fixed:', modifiedNamesCount);
console.log('• Duplicate variant entries merged:', mergedDuplicatesCount);
console.log('• Finalized unique clean products:', finalizedProducts.length);

// Write to clean catalog
fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(finalizedProducts, null, 2), 'utf8');
console.log('✅ Successfully updated src/data/all_clean_products.json');
