import fs from 'fs';

async function checkPandaData() {
  // Fetch categories
  const catRes = await fetch("https://pandasanoatsavdo.uz/wp-json/wp/v2/product_cat?per_page=100");
  const cats = await catRes.json();
  console.log("Categories:", cats.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count })));

  // Fetch all products
  let allProducts = [];
  let page = 1;
  while (true) {
    const res = await fetch(`https://pandasanoatsavdo.uz/wp-json/wp/v2/product?per_page=100&page=${page}`);
    if (!res.ok) break;
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    allProducts.push(...items);
    page++;
  }
  console.log(`Fetched total ${allProducts.length} raw products from pandasanoatsavdo.uz`);

  // Fetch all media
  let mediaMap = {};
  let mPage = 1;
  while (true) {
    const res = await fetch(`https://pandasanoatsavdo.uz/wp-json/wp/v2/media?per_page=100&page=${mPage}`);
    if (!res.ok) break;
    const mediaItems = await res.json();
    if (!Array.isArray(mediaItems) || mediaItems.length === 0) break;
    mediaItems.forEach(m => {
      mediaMap[m.id] = m.source_url;
    });
    mPage++;
  }
  console.log(`Mapped ${Object.keys(mediaMap).length} media items.`);

  fs.writeFileSync("panda_raw_products.json", JSON.stringify(allProducts, null, 2));
  fs.writeFileSync("panda_media.json", JSON.stringify(mediaMap, null, 2));

  console.log("Sample product titles:");
  allProducts.slice(0, 15).forEach(p => {
    console.log(`- ID: ${p.id}, Title: ${p.title?.rendered}, Media: ${p.featured_media}, Link: ${p.link}`);
  });
}

checkPandaData();
