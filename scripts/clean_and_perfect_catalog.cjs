const fs = require('fs');
const pg = require('pg');
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));

// Normalize category mapping
function normalizeCategory(catId) {
  if (!catId) return 'cat_grocery';
  if (catId.startsWith('cat_sfad_') || catId.startsWith('cat_panda_') || catId.startsWith('cat_kdv_') || catId.startsWith('cat_bondi_')) {
    if (catId.includes('juice') || catId.includes('nectar') || catId.includes('tea') || catId.includes('drinks')) return 'cat_beverages';
    if (catId.includes('snacks')) return 'cat_snacks';
    return 'cat_confectionery';
  }
  if (catId === 'cat_drinks') return 'cat_beverages';
  if (catId === 'cat_fruits') return 'cat_fruits_vegetables';
  return catId;
}

// Normalize units
function normalizeUnit(unit) {
  if (!unit) return 'dona';
  const u = unit.toLowerCase().trim();
  if (u === 'кг' || u === 'kg' || u === 'kilogram') return 'kg';
  if (u === 'л' || u === 'l' || u === 'litr') return 'litr';
  if (u === 'шт' || u === 'dona' || u === 'don' || u === 'd') return 'dona';
  if (u === 'blok' || u === 'блок') return 'blok';
  if (u === 'pachka' || u === 'пачка') return 'pachka';
  if (u === 'quti' || u === 'коробка') return 'quti';
  return 'dona';
}

// Deep clean title
function cleanString(str) {
  if (!str) return '';
  let res = str;

  // 1. Remove fabricated variant / tur expressions
  res = res.replace(/\s*\(\s*(?:Klassik|Классик)?\s*\(?\s*(?:Variant|Вариант)\s*\d+\s*\)?\s*\)/gi, '');
  res = res.replace(/\s*\(\s*(?:Variant|Вариант)\s*\d+\s*\)/gi, '');
  res = res.replace(/\b(?:Variant|Вариант)\s*\d+\b/gi, '');
  res = res.replace(/\s*\(\s*\d+-(?:classic|klassik)?\s*tur\s*\)/gi, '');
  res = res.replace(/\s*\(\s*\d+-tur\s*\)/gi, '');
  res = res.replace(/\b\d+-(?:classic|klassik)\s*tur\b/gi, '');
  res = res.replace(/\b\d+-tur\b/gi, '');
  res = res.replace(/\s*\(\s*(?:Turi|Tur|Вид)\s*\d+\s*\)/gi, '');
  res = res.replace(/\s*\(\s*(?:Klassik|Классик)\s*\)/gi, '');

  // 2. Remove internal raw IDs in parentheses like (48), (4121)
  res = res.replace(/\s*\(\s*\d{2,6}\s*\)$/g, '');

  // 3. Clean empty parentheses and spacing
  res = res.replace(/\s*\(\s*\)/g, '');
  res = res.replace(/\s+/g, ' ').trim();

  // 4. Normalize decimal commas (0,5L -> 0.5L, 1,5kg -> 1.5kg)
  res = res.replace(/(\d+),(\d+)/g, '$1.$2');

  // 5. Remove trailing commas or hyphens
  res = res.replace(/[,-]\s*$/, '').trim();

  return res;
}

console.log('🔄 Cleaning all 5,252 products...');

const cleanedProducts = products.map(p => {
  let nameUz = cleanString(p.nameUz || p.name || '');
  let nameRu = cleanString(p.nameRu || p.name || nameUz);
  let nameEn = cleanString(p.nameEn || nameUz);

  if (!nameUz || nameUz.length < 2) {
    nameUz = `Mahsulot (${p.barcode})`;
  }
  if (!nameRu || nameRu.length < 2) {
    nameRu = nameUz;
  }
  if (!nameEn || nameEn.length < 2) {
    nameEn = nameUz;
  }

  const categoryId = normalizeCategory(p.categoryId);
  const unit = normalizeUnit(p.unit);

  return {
    ...p,
    nameUz,
    nameRu,
    nameEn,
    categoryId,
    unit,
    descriptionUz: `${nameUz} - Yuqori sifatli, sertifikatlangan yangi mahsulot.`,
    descriptionRu: `${nameRu} - Сертифицированный качественный товар.`
  };
});

fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(cleanedProducts, null, 2), 'utf8');
console.log('✅ Updated src/data/all_clean_products.json');

// Sync to PostgreSQL DB
async function syncDb() {
  console.log('⚡ Syncing cleaned products to PostgreSQL DB...');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    const batchSize = 100;
    for (let i = 0; i < cleanedProducts.length; i += batchSize) {
      const chunk = cleanedProducts.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      chunk.forEach((p, idx) => {
        const offset = idx * 2;
        placeholders.push(`($${offset + 1}, $${offset + 2}, NOW())`);
        values.push(p.id, JSON.stringify(p));
      });
      const sql = `
        INSERT INTO products_db (id, data, updated_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
      `;
      await client.query(sql, values);
    }
    console.log('🎉 PostgreSQL sync completed successfully!');
  } catch (e) {
    console.error('Database sync error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

syncDb();
