const fs = require('fs');

const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));
console.log('=== TOTAL PRODUCTS LOADED FOR AUDIT:', products.length, '===');

// 1. Check Barcode Duplicates
const barcodeMap = new Map();
const barcodeDuplicates = [];
const missingBarcodes = [];

products.forEach(p => {
  if (!p.barcode || p.barcode.trim() === '') {
    missingBarcodes.push(p);
  } else {
    if (barcodeMap.has(p.barcode)) {
      barcodeDuplicates.push({
        barcode: p.barcode,
        existing: barcodeMap.get(p.barcode).nameUz,
        duplicate: p.nameUz
      });
    } else {
      barcodeMap.set(p.barcode, p);
    }
  }
});

console.log('\n--- 1. BARCODE AUDIT ---');
console.log('Total unique barcodes:', barcodeMap.size);
console.log('Duplicate barcodes found:', barcodeDuplicates.length);
if (barcodeDuplicates.length > 0) {
  console.log('Sample duplicate barcodes:', barcodeDuplicates.slice(0, 5));
}
console.log('Missing/Empty barcodes:', missingBarcodes.length);

// 2. Check Name Quality & Weird Suffixes
console.log('\n--- 2. NAME QUALITY & STRANGE PATTERNS AUDIT ---');
const strangePatterns = [
  /variant/i,
  /turi\s*\d+/i,
  /\d+-tur/i,
  /vid\s*\d+/i,
  /undefined/i,
  /null/i,
  /\$\d+/i,
  /&#\d+;/,
  /\?\?/,
  /NaN/
];

const suspiciousNames = [];
products.forEach(p => {
  const n = (p.nameUz || '') + ' ' + (p.nameRu || '');
  strangePatterns.forEach(regex => {
    if (regex.test(n)) {
      suspiciousNames.push({ id: p.id, nameUz: p.nameUz, nameRu: p.nameRu, matched: regex.toString() });
    }
  });
});

console.log('Suspicious/Strange named products count:', suspiciousNames.length);
if (suspiciousNames.length > 0) {
  console.log('Sample suspicious names:', suspiciousNames.slice(0, 10));
}

// 3. Price & CostPrice Sanity
console.log('\n--- 3. PRICING AUDIT ---');
let zeroPrice = 0;
let zeroCost = 0;
let costGreaterThanPrice = 0;
let negativePrice = 0;

products.forEach(p => {
  if (!p.price || p.price <= 0) zeroPrice++;
  if (p.costPrice === undefined || p.costPrice === null || p.costPrice < 0) zeroCost++;
  if (p.costPrice > p.price) costGreaterThanPrice++;
});

console.log('Products with 0 or missing retail price:', zeroPrice);
console.log('Products with missing cost price:', zeroCost);
console.log('Products with cost price > retail price:', costGreaterThanPrice);

// 4. Categories & Units Distribution
console.log('\n--- 4. CATEGORY & UNIT AUDIT ---');
const catCount = {};
const unitCount = {};
products.forEach(p => {
  catCount[p.categoryId] = (catCount[p.categoryId] || 0) + 1;
  unitCount[p.unit] = (unitCount[p.unit] || 0) + 1;
});
console.log('Category distribution:', catCount);
console.log('Unit distribution:', unitCount);
