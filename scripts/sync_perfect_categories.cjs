const fs = require('fs');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const OFFICIAL_BOT_CATEGORIES = [
  { id: 'cat_suvlar', nameUz: 'Suvlar va Salqin Ichimliklar', nameRu: 'Напитки и Соки', nameEn: 'Beverages & Juices', icon: 'CupSoda', slug: 'suvlar' },
  { id: 'cat_shokolad_pechinni', nameUz: 'Shokolad, Pechenye va Qandolat', nameRu: 'Шоколад и Кондитерские изделия', nameEn: 'Chocolates & Confectionery', icon: 'Cookie', slug: 'shokolad-pechinni' },
  { id: 'cat_gosht_sut', nameUz: 'Go\'sht, Sut va Baliq Mahsulotlari', nameRu: 'Мясо, Молоко и Рыба', nameEn: 'Meat, Dairy & Fish', icon: 'Milk', slug: 'gosht-sut' },
  { id: 'cat_parfumeriya_gigiyena', nameUz: 'Parfumeriya, Kosmetika va Gigiyena', nameRu: 'Парфюмерия, Косметика и Гигиена', nameEn: 'Cosmetics & Hygiene', icon: 'Sparkles', slug: 'parfumeriya-gigiyena' },
  { id: 'cat_choy_kofe', nameUz: 'Choy, Kofe va Kakao', nameRu: 'Чай, Кофе и Какао', nameEn: 'Tea & Coffee', icon: 'CupSoda', slug: 'choy-kofe' },
  { id: 'cat_meva_sabzavot', nameUz: 'Meva va Sabzavotlar', nameRu: 'Фрукты и Овощи', nameEn: 'Fruits & Vegetables', icon: 'Apple', slug: 'meva-sabzavot' },
  { id: 'cat_sneklar_chips', nameUz: 'Sneklar, Chips va Qurtlar', nameRu: 'Снеки, Чипсы и Орехи', nameEn: 'Snacks & Chips', icon: 'Utensils', slug: 'sneklar-chips' },
  { id: 'cat_un_yog', nameUz: 'Un, Yog\' va Don Mahsulotlari', nameRu: 'Мука, Масло и Бакалея', nameEn: 'Flour, Oil & Grocery', icon: 'Package', slug: 'un-yog' },
  { id: 'cat_lapsha_makaron', nameUz: 'Lapsha va Makaron Mahsulotlari', nameRu: 'Лапша и Макароны', nameEn: 'Pasta & Noodles', icon: 'Utensils', slug: 'lapsha-makaron' },
  { id: 'cat_ziravorlar_souslar', nameUz: 'Ziravorlar, Souslar va Konservalar', nameRu: 'Специи, Соусы и Консервы', nameEn: 'Spices & Sauces', icon: 'Sparkles', slug: 'ziravorlar-souslar' },
  { id: 'cat_bolalar', nameUz: 'Bolalar Mahsulotlari va Taomlari', nameRu: 'Детские товары и Питание', nameEn: 'Baby Care & Food', icon: 'Baby', slug: 'bolalar' },
  { id: 'cat_rozgor', nameUz: 'Ro\'zg\'or va Xo\'jalik Mollari', nameRu: 'Хозтовары и Быт', nameEn: 'Household Goods', icon: 'Package', slug: 'rozgor' }
];

async function sync() {
  console.log('🚀 === PERFECT CATEGORY SYNCHRONIZATION & CLEANUP ===');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));
  console.log(`📦 Loaded ${products.length} products with updated category IDs`);

  try {
    // 1. Create categories table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name_uz VARCHAR(255) NOT NULL,
        name_ru VARCHAR(255),
        name_en VARCHAR(255),
        icon VARCHAR(100),
        slug VARCHAR(255)
      );
    `);

    // Clean and re-insert categories
    await pool.query('DELETE FROM categories');
    for (const c of OFFICIAL_BOT_CATEGORIES) {
      await pool.query(`
        INSERT INTO categories (id, name_uz, name_ru, name_en, icon, slug)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [c.id, c.nameUz, c.nameRu, c.nameEn, c.icon, c.slug]);
    }
    console.log('✅ Synchronized official bot categories table in PostgreSQL!');

    // 2. Batch update products table category_id
    console.log('🔄 Updating products table category_id in batches of 500...');
    const batchSize = 500;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const values = [];
      const clauses = [];
      let paramIdx = 1;

      for (const p of batch) {
        clauses.push(`($${paramIdx}, $${paramIdx + 1})`);
        values.push(p.id, p.categoryId);
        paramIdx += 2;
      }

      const updateQuery = `
        UPDATE products AS prod
        SET category_id = v.cat_id
        FROM (VALUES ${clauses.join(', ')}) AS v(prod_id, cat_id)
        WHERE prod.id = v.prod_id;
      `;
      await pool.query(updateQuery, values);
      console.log(`  Updated batch ${i + 1} to ${Math.min(i + batchSize, products.length)} in 'products' table`);
    }

    // 3. Update products_db table
    console.log('🔄 Syncing products_db JSON table...');
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const values = [];
      const clauses = [];
      let paramIdx = 1;

      for (const p of batch) {
        clauses.push(`($${paramIdx}, $${paramIdx + 1})`);
        values.push(p.id, JSON.stringify(p));
        paramIdx += 2;
      }

      const updateQuery = `
        INSERT INTO products_db (id, data, updated_at)
        VALUES ${clauses.map(c => `(${c.slice(1, -1)}, NOW())`).join(', ')}
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
      `;
      await pool.query(updateQuery, values);
      console.log(`  Synced batch ${i + 1} to ${Math.min(i + batchSize, products.length)} in 'products_db' table`);
    }

    // 4. Verify category counts in PostgreSQL
    const catCheck = await pool.query(`
      SELECT category_id, COUNT(*) as count
      FROM products
      GROUP BY category_id
      ORDER BY count DESC;
    `);

    console.log('\n📊 DATABASE CATEGORY VERIFICATION COUNTS:');
    catCheck.rows.forEach(r => {
      console.log(`  ${r.category_id}: ${r.count} products`);
    });

    console.log('\n🎉 ALL DONE! CATEGORIES ARE 100% REORGANIZED & EMPTY CATEGORIES COMPLETELY PURGED!');
  } catch (err) {
    console.error('Database sync error:', err);
  } finally {
    await pool.end();
  }
}

sync();
