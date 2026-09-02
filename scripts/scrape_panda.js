import fs from 'fs';

async function testPanda() {
  const url = "https://pandasanoatsavdo.uz/catalog/";
  try {
    console.log("Fetching:", url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    console.log("Status:", res.status);
    if (res.ok) {
      const html = await res.text();
      console.log("HTML length:", html.length);
      fs.writeFileSync("panda_page.html", html, "utf8");

      // Check WP JSON or WooCommerce REST API
      const wpApiRes = await fetch("https://pandasanoatsavdo.uz/wp-json/wp/v2/product_cat?per_page=100");
      console.log("WP Cat API Status:", wpApiRes.status);
      if (wpApiRes.ok) {
        const cats = await wpApiRes.json();
        console.log("WP Categories:", cats.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
      }

      // Check links in HTML
      const matches = html.match(/href=["']([^"']+)["']/g) || [];
      const uniqueLinks = Array.from(new Set(matches.map(m => m.replace(/href=["']|["']/g, ''))));
      console.log("Sample links:", uniqueLinks.filter(l => l.includes("catalog") || l.includes("product") || l.includes("category")).slice(0, 30));
    }
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}

testPanda();
