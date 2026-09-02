const fs = require("fs");
const { Pool } = require("pg");

async function main() {
  console.log("=== SYNCHRONIZING BOTH .image AND .imageUrl FOR ALL 8,852 PRODUCTS ===");

  const raw = fs.readFileSync("src/data/all_clean_products.json", "utf8");
  const prods = JSON.parse(raw);

  let updatedCount = 0;
  const synchronizedProds = prods.map(p => {
    const url = p.imageUrl || p.image || "";
    updatedCount++;
    return {
      ...p,
      image: url,
      imageUrl: url
    };
  });

  console.log(`Updated ${updatedCount} products with both image and imageUrl.`);
  fs.writeFileSync("src/data/all_clean_products.json", JSON.stringify(synchronizedProds, null, 2));

  // Sync to Neon PostgreSQL
  console.log("Updating Neon PostgreSQL database with synchronized image fields...");
  const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Truncating products_db...");
    await client.query("TRUNCATE TABLE products_db");

    console.log("Inserting all 8,852 products into database...");
    const CHUNK_SIZE = 400;
    for (let i = 0; i < synchronizedProds.length; i += CHUNK_SIZE) {
      const chunk = synchronizedProds.slice(i, i + CHUNK_SIZE);
      const query = `
        INSERT INTO products_db (id, data, updated_at)
        VALUES ` + chunk.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2}, NOW())`).join(",") +
        ` ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`;

      const values = [];
      chunk.forEach(p => {
        values.push(p.id, JSON.stringify(p));
      });

      await client.query(query, values);
    }

    await client.query("COMMIT");
    console.log("Neon DB image field synchronization successful!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Neon DB update error:", err);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("=== COMPLETED ===");
}

main().catch(console.error);
