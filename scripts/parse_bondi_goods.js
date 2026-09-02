import https from 'https';
import fs from 'fs';

const goodsIds = ['552', '399', '692', '561', '160', '649', '675', '683'];

async function fetchGoods(id) {
  return new Promise((resolve) => {
    https.get('https://kdv-group.com/ru/catalog/' + id, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ id, data }));
    }).on('error', () => resolve({ id, data: '' }));
  });
}

async function run() {
  const results = [];
  for (const gid of goodsIds) {
    const { id, data } = await fetchGoods(gid);
    
    // Parse slides/offers inside .j-connected-carousels
    // In catalog page, each slide contains offer data
    const offerBlocks = [...data.matchAll(/<div[^>]*class="[^"]*carousel-stage-item[^"]*"[^>]*data-offerId="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)];
    
    console.log(`Goods ID ${id} has ${offerBlocks.length} stage items or checking HTML...`);
    
    // Let's inspect titles, images, descriptions
    const titles = [...data.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    const h2s = [...data.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    const paragraphs = [...data.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    const images = [...data.matchAll(/src="([^"]*catalog-offer[^"]*)"/gi)].map(m => m[1]);
    
    results.push({
      goodsId: id,
      titles,
      h2s,
      paragraphs,
      images,
      rawSnippet: data.substring(0, 3000)
    });
  }

  fs.writeFileSync('/tmp/bondi_goods_parsed.json', JSON.stringify(results, null, 2));
  console.log('Saved /tmp/bondi_goods_parsed.json');
}

run();
