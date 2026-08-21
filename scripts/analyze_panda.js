import fs from 'fs';

const rawProducts = JSON.parse(fs.readFileSync("panda_raw_products.json", "utf8"));
let mediaMap = {};
if (fs.existsSync("panda_media.json")) {
  mediaMap = JSON.parse(fs.readFileSync("panda_media.json", "utf8"));
}

console.log(`Total raw products: ${rawProducts.length}`);

// Inspect sample product
const sample = rawProducts[0];
console.log("Sample keys:", Object.keys(sample));
console.log("Sample product taxonomy/categories:", sample.product_cat);

// Build category map from WP taxonomy or product_cat array
const catCounts = {};
rawProducts.forEach(p => {
  if (Array.isArray(p.product_cat)) {
    p.product_cat.forEach(cId => {
      catCounts[cId] = (catCounts[cId] || 0) + 1;
    });
  }
});
console.log("Category ID counts:", catCounts);

// Let's print out the first 20 products with images and details
const formatted = rawProducts.map(p => {
  const imageUrl = mediaMap[p.featured_media] || p.featured_image_src || "";
  const title = p.title?.rendered ? p.title.rendered.replace(/&#\d+;/g, '').replace(/&amp;/g, '&') : "";
  return {
    id: p.id,
    title,
    slug: p.slug,
    product_cat: p.product_cat,
    media_id: p.featured_media,
    imageUrl,
    link: p.link
  };
});

console.log("Sample formatted products:");
console.log(formatted.slice(0, 15));
