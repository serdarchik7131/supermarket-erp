const fs = require("fs");
const { Pool } = require("pg");

async function main() {
  console.log("=== REMOVING ALL AUTOMATIC / FALLBACK IMAGES FROM ALL PRODUCTS ===");

  const raw = fs.readFileSync("src/data/all_clean_products.json", "utf8");
  const prods = JSON.parse(raw);

  const cleanedProds = prods.map(p => ({
    ...p,
    image: "",
    imageUrl: ""
  }));

  console.log(`Cleared images for all ${cleanedProds.length} products.`);
  fs.writeFileSync("src/data/all_clean_products.json", JSON.stringify(cleanedProds, null, 2));

  // Sync to Neon PostgreSQL
  console.log("Syncing cleared image fields to Neon PostgreSQL database...");
  const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Truncating products_db table...");
    await client.query("TRUNCATE TABLE products_db");

    console.log("Inserting all 8,852 products with clean/empty image fields...");
    const CHUNK_SIZE = 400;
    for (let i = 0; i < cleanedProds.length; i += CHUNK_SIZE) {
      const chunk = cleanedProds.slice(i, i + CHUNK_SIZE);
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
    console.log("Neon DB cleared image sync completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DB Sync error:", err);
  } finally {
    client.release();
    await pool.end();
  }

  console.log("=== ALL IMAGES REMOVED SUCCESSFULLY ===");
}

main().catch(console.error);
