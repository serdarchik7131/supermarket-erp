import fs from 'fs';

const snippets = JSON.parse(fs.readFileSync("sfad_snippets.json", "utf8"));

// Filter out logo or non-product images (e.g. 512-512-1.png, icons)
const productSnippets = snippets.filter(s => {
  return s.imgSrc.includes('/2024/08/') || s.imgSrc.includes('/2024/09/') || s.imgSrc.includes('/2024/03/');
}).filter(s => !s.imgSrc.includes('512-512-1.png'));

console.log(`Found ${productSnippets.length} product image snippets.`);

const products = [];

productSnippets.forEach((s, idx) => {
  // Extract text around the image
  const text = s.snippetText;
  
  // Clean up elementor class remnants
  const cleanedText = text
    .replace(/elementor-[a-z0-9-]+/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  products.push({
    index: idx + 1,
    image: s.imgSrc,
    rawText: cleanedText
  });
});

console.log("\nSample 15 cleaned product snippets:");
products.slice(0, 15).forEach(p => {
  console.log(`[${p.index}] Img: ${p.image.split('/').pop()}`);
  console.log(`    Text: ${p.rawText}`);
});

fs.writeFileSync("sfad_products_raw.json", JSON.stringify(products, null, 2));
