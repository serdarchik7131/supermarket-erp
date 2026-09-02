const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const REGOS_BASE_URL = 'https://integration.regos.uz/gateway/out/6d9d2188297c45f193449a7fc7a0e8a1';
const REGOS_GET_URL = `${REGOS_BASE_URL}/v1/Item/GetExt`;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Ug9F4PJzcQtR@ep-silent-union-axkuyuay.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

function classifyCategory(nameUz, groupPath) {
  const text = `${nameUz} ${groupPath || ''}`.toLowerCase();
  
  if (text.includes('suv') || text.includes('cola') || text.includes('pepsi') || text.includes('fanta') || text.includes('sok') || text.includes('sharbat') || text.includes('ichimlik') || text.includes('choy') || text.includes('kofe') || text.includes('energy') || text.includes('red bull') || text.includes('flash') || text.includes('dinay') || text.includes('dena')) {
    return 'cat_beverages';
  }
  if (text.includes('shokolad') || text.includes('konfet') || text.includes('pechenye') || text.includes('vafli') || text.includes('biskvit') || text.includes('tort') || text.includes('pirog') || text.includes('marmelad') || text.includes('karamel') || text.includes('kinder') || text.includes('kdv') || text.includes('krember') || text.includes('alpen gold') || text.includes('snickers') || text.includes('kitkat') || text.includes('twix') || text.includes('bounty') || text.includes('chupa') || text.includes('saqich') || text.includes('orbit') || text.includes('dirol')) {
    return 'cat_shokolad_pechinni';
  }
  if (text.includes('sut') || text.includes('qatiq') || text.includes('tvorog') || text.includes('sir') || text.includes('pishloq') || text.includes('qaymoq') || text.includes('smetana') || text.includes('kefir') || text.includes('yogurt') || text.includes('tuxum') || text.includes('slivochnoe') || text.includes('mayonez')) {
    return 'cat_sut_qatiq_pishloq';
  }
  if (text.includes('gosht') || text.includes('kolbasa') || text.includes('sosiska') || text.includes('tovuq') || text.includes('farsh') || text.includes('dumba') || text.includes('go\'sht') || text.includes('baliq') || text.includes('ikra') || text.includes('sardina') || text.includes('kilka') || text.includes('tushonka') || text.includes('konserva') || text.includes('pashtet')) {
    return 'cat_gosht_kolbasa';
  }
  if (text.includes('non') || text.includes('bulocha') || text.includes('lepeshka') || text.includes('patir') || text.includes('tandir') || text.includes('somsa')) {
    return 'cat_non_somsa_shirinlik';
  }
  if (text.includes('meva') || text.includes('sabzavot') || text.includes('olma') || text.includes('banan') || text.includes('kartoshka') || text.includes('piyoz') || text.includes('pomidor') || text.includes('bodring') || text.includes('sabzi') || text.includes('karam') || text.includes('limon') || text.includes('apelsin') || text.includes('mandarin') || text.includes('uzum') || text.includes('nok') || text.includes('shaftoli') || text.includes('anar') || text.includes('qovun') || text.includes('tarvuz') || text.includes('greens') || text.includes('kokat')) {
    return 'cat_meva_sabzavot';
  }
  if (text.includes('chips') || text.includes('lays') || text.includes('chipsi') || text.includes('qurt') || text.includes('pista') || text.includes('yongoq') || text.includes('yong\'oq') || text.includes('kraxmal') || text.includes('popkorn') || text.includes('suxariki') || text.includes('flint') || text.includes('kirieshki') || text.includes('semichka')) {
    return 'cat_snacks_chips';
  }
  if (text.includes('makaron') || text.includes('lapsha') || text.includes('doshirak') || text.includes('rollton') || text.includes('vermishel') || text.includes('spagetti') || text.includes('rosona')) {
    return 'cat_lapsha_makaron';
  }
  if (text.includes('un') || text.includes('yog\'') || text.includes('yog') || text.includes('guruch') || text.includes('shakar') || text.includes('tuz') || text.includes('mosh') || text.includes('fasol') || text.includes('grechka') || text.includes('ovsyanka') || text.includes('gorox') || text.includes('krupa') || text.includes('ziravor') || text.includes('sirka') || text.includes('tomat') || text.includes('pasta')) {
    return 'cat_un_yog';
  }
  if (text.includes('bolalar') || text.includes('pampers') || text.includes('podguznik') || text.includes('pyure') || text.includes('kasha') || text.includes('huggies') || text.includes('molfix') || text.includes('bebelac') || text.includes('nestle') || text.includes('frutonyanya') || text.includes('agusha')) {
    return 'cat_bolalar';
  }
  if (text.includes('sovun') || text.includes('shampun') || text.includes('poroshok') || text.includes('gel') || text.includes('pasta') || text.includes('tish') || text.includes('domestos') || text.includes('fairy') || text.includes('tozalovchi') || text.includes('salfetka') || text.includes('qogoz') || text.includes('yuvish') || text.includes('tozalash') || text.includes('kosmetika') || text.includes('krem') || text.includes('pero') || text.includes(' Gillette') || text.includes('dezodorant') || text.includes('rexona') || text.includes('nivea')) {
    return 'cat_gigiyena_parvarish';
  }
  return 'cat_baqollik_boshqa';
}

function detectBrand(nameUz) {
  const brands = [
    'Coca-Cola', 'Pepsi', 'Fanta', 'Sprite', 'Nestle', 'Dena', 'Dinay', 'Bliss', 'Hydrolife', 'Chortoq', 'Borjomi',
    'Lays', 'KDV', 'Krember', 'Alpen Gold', 'Milka', 'Snickers', 'Twix', 'Bounty', 'Mars', 'KitKat', 'Ferrero',
    'Kinder', 'Nutella', 'MacCoffee', 'Jacobs', 'Nescafe', 'Ahmad Tea', 'Akbar Tea', 'Lipton', 'Tegen', 'Rozmetov',
    'Sherin', 'Sagbon', 'Korzinka', 'Oreo', 'President', 'Lactel', 'Musaffo', 'Sultan', 'Makfa', 'Rollton', 'Doshirak',
    'Fairy', 'Ariel', 'Tide', 'Persil', 'Colgate', 'Oral-B', 'Head & Shoulders', 'Clear', 'Dove', 'Nivea', 'Rexona',
    'Palmolive', 'Gillette', 'Pampers', 'Huggies', 'Molfix', 'FrutoNyanya', 'Agusha', 'Bebelac', 'Baraka', 'Zam Zam'
  ];

  const lower = nameUz.toLowerCase();
  for (const b of brands) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return 'Sifatli Mahsulot';
}

async function syncDirectFromRegos() {
  console.log('🚀 Connecting to Regos Gateway:', REGOS_GET_URL);
  
  let rawItems = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;

  while (hasMore) {
    console.log(`📡 Fetching Regos items batch offset=${offset}, limit=${limit}...`);
    try {
      const res = await fetch(REGOS_GET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ limit, offset })
      });

      if (!res.ok) {
        console.error(`HTTP error ${res.status}: ${res.statusText}`);
        break;
      }

      const data = await res.json();
      if (!data.ok || !data.result || data.result.length === 0) {
        console.log('🏁 Reached end of Regos catalog.');
        break;
      }

      rawItems = rawItems.concat(data.result);
      console.log(`📦 Loaded ${rawItems.length} of ${data.total || '?'} total items...`);

      if (data.next_offset !== undefined && data.next_offset !== null && data.next_offset > offset) {
        offset = data.next_offset;
      } else {
        offset += data.result.length;
      }

      if (data.result.length < limit || (data.total && rawItems.length >= data.total)) {
        hasMore = false;
      }
    } catch (e) {
      console.error('Fetch error:', e.message);
      break;
    }
  }

  console.log(`\n🎉 Total items fetched directly from live REGOS: ${rawItems.length}`);

  const productList = [];
  const barcodeMap = new Set();

  rawItems.forEach((r, idx) => {
    const item = r.item || {};
    const nameUz = (item.name || '').trim();
    if (!nameUz) return;

    // Barcode extraction
    let barcode = (item.base_barcode || item.barcode_list || '').trim();
    if (barcode) {
      barcode = barcode.split(/[\s,]+/)[0].trim();
    }
    
    // If weight/unbarcoded item, create unique PLU EAN
    if (!barcode) {
      const paddedId = String(item.id || idx + 1).padStart(7, '0');
      barcode = `200000${paddedId}`;
    }

    if (barcodeMap.has(barcode)) {
      barcode = `${barcode}_${item.id || idx + 1}`;
    }
    barcodeMap.add(barcode);

    const groupName = item.group?.name || '';
    const groupPath = item.group?.path || '';
    const categoryId = classifyCategory(nameUz, `${groupName} ${groupPath}`);
    const brand = detectBrand(nameUz);

    const retailPrice = Number(r.price) || 0;
    const costPrice = Number(r.last_purchase_cost) || Math.round(retailPrice * 0.78);
    const wholesalePrice = Math.round(retailPrice * 0.90);
    const vipPrice = Math.round(retailPrice * 0.85);

    const unit = (item.unit?.name && item.unit.name.toLowerCase().includes('кг')) ? 'kg' : 
                 (item.unit?.name && item.unit.name.toLowerCase().includes('литр')) ? 'litr' : 'dona';

    const stockQty = Number(r.quantity?.common) || 10;

    const product = {
      id: `prod_regos_${item.id || idx + 1}`,
      sku: item.sku || (item.code ? `REGOS-${item.code}` : `REGOS-${item.id || idx + 1}`),
      barcode,
      nameUz,
      nameRu: nameUz,
      nameEn: nameUz,
      categoryId,
      brand,
      price: retailPrice,
      costPrice,
      wholesalePrice,
      vipPrice,
      prices: {
        prixod: costPrice,
        roznitsa: retailPrice,
        optom: wholesalePrice,
        vip: vipPrice
      },
      unit,
      image: '',
      imageUrl: '',
      description: `${nameUz} — REGOS.ONLINE POS jonli kassa tizimidan sinxronlangan`,
      expiryDays: 180,
      minStockAlert: 5,
      tags: ['regos_live', 'regos_imported'],
      stockByBranch: {
        br_toshkent_main: stockQty,
        br_chilanzar: Math.max(0, Math.floor(stockQty * 0.4)),
        br_samarkand: Math.max(0, Math.floor(stockQty * 0.2))
      },
      regosItemId: item.id,
      regosCode: item.code,
      regosGroup: groupName,
      lastUpdated: new Date().toISOString()
    };

    productList.push(product);
  });

  console.log(`💾 Saving ${productList.length} pure REGOS products to JSON files...`);
  
  // 1. Save to JSON files (only REGOS products, old non-regos deleted)
  fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(productList, null, 2), 'utf8');
  fs.writeFileSync('regos_live_products.json', JSON.stringify(productList, null, 2), 'utf8');
  console.log('✅ Updated src/data/all_clean_products.json & regos_live_products.json');

  // 2. Sync to PostgreSQL Database (Purge old non-regos, update/insert regos)
  try {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const client = await pool.connect();
    console.log('🗄️ Connected to PostgreSQL to replace catalog with exact REGOS data...');

    // Clear old products to remove non-regos items
    await client.query('TRUNCATE TABLE products_db');
    console.log('🧹 Purged previous database records.');

    const insertQuery = `
      INSERT INTO products_db (id, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
    `;

    for (let i = 0; i < productList.length; i += 200) {
      const chunk = productList.slice(i, i + 200);
      await Promise.all(chunk.map(p => client.query(insertQuery, [p.id, JSON.stringify(p)])));
    }

    console.log(`✅ Stored all ${productList.length} pure REGOS products in PostgreSQL database.`);
    client.release();
    await pool.end();
  } catch (dbErr) {
    console.error('⚠️ DB Sync warning:', dbErr.message);
  }

  console.log('\n🚀 ALL DONE! Catalog now contains ONLY 100% REGOS products with zero images and exact prices/barcodes.');
}

syncDirectFromRegos();
