import https from 'https';
import fs from 'fs';

const offerData = [
  { id: '2296', img: 'https://kdv-group.com/uploads/catalog-offer/d0a3237f25311021eb912461c17a326c.jpg', weight: '32 г', category: 'Бисквиты' },
  { id: '2297', img: 'https://kdv-group.com/uploads/catalog-offer/3364dd9ab5a31475983643450a840d16.jpg', weight: '32 г', category: 'Бисквиты' },
  { id: '2298', img: 'https://kdv-group.com/uploads/catalog-offer/424c32d71e75083cae94f682306e4da1.jpg', weight: '32 г', category: 'Бисквиты' },
  { id: '2809', img: 'https://kdv-group.com/uploads/catalog-offer/be5ee5cd921ca949c4cd717cce24086a.jpg', weight: '32 г', category: 'Бисквиты' },
  { id: '930', img: 'https://kdv-group.com/uploads/catalog-offer/baf0d4d5a039130fd83d3cd3fe817647.jpg', weight: '40 г', category: 'Гематоген' },
  { id: '3672', img: 'https://kdv-group.com/uploads/catalog-offer/500181d12ce213bafb1fc97b095b3781.jpg', weight: '90 г', category: 'Детское питание' },
  { id: '3673', img: 'https://kdv-group.com/uploads/catalog-offer/9a87f66e9e37a49d9633c2a67143bdba.jpg', weight: '90 г', category: 'Детское питание' },
  { id: '3674', img: 'https://kdv-group.com/uploads/catalog-offer/2f188377aa50c573713975c64c94a7d6.jpg', weight: '90 г', category: 'Детское питание' },
  { id: '3675', img: 'https://kdv-group.com/uploads/catalog-offer/2b0b75fc96b2149ea8946691f3ef8054.jpg', weight: '90 г', category: 'Детское питание' },
  { id: '3676', img: 'https://kdv-group.com/uploads/catalog-offer/e8f897aa7b899ad2386a105110fafe66.jpg', weight: '90 г', category: 'Детское питание' },
  { id: '2360', img: 'https://kdv-group.com/uploads/catalog-offer/8ebeb10c50731c3c41f95d2d547e42a6.jpg', weight: '30 г', category: 'Мармелад жевательный' },
  { id: '2361', img: 'https://kdv-group.com/uploads/catalog-offer/bc48e301f4bb7bdcd2bfcfca63cf282a.jpg', weight: '70 г', category: 'Мармелад жевательный' },
  { id: '2362', img: 'https://kdv-group.com/uploads/catalog-offer/5254bad5cf5fe3445ccffbac400d6e99.jpg', weight: '100 г', category: 'Мармелад жевательный' },
  { id: '545', img: 'https://kdv-group.com/uploads/catalog-offer/2f7b63809efa10b1174adeed067b35bb.jpg', weight: '180 г', category: 'Печенье фасованное' },
  { id: '3834', img: 'https://kdv-group.com/uploads/catalog-offer/d4668aafc3f80d8fedb4f025bdb8a2eb.jpg', weight: '80 г', category: 'Печенье фасованное' },
  { id: '546', img: 'https://kdv-group.com/uploads/catalog-offer/e2f820eed1d5bcd153f15ec9b9753e84.jpg', weight: '180 г', category: 'Печенье фасованное' },
  { id: '547', img: 'https://kdv-group.com/uploads/catalog-offer/24528625cac8f6ed03a94d1644072e8b.jpg', weight: '180 г', category: 'Печенье фасованное' },
  { id: '3835', img: 'https://kdv-group.com/uploads/catalog-offer/f76473d29074bd34f6b42d090cc37953.jpg', weight: '80 г', category: 'Печенье фасованное' },
  { id: '3787', img: 'https://kdv-group.com/uploads/catalog-offer/6729bb49a96e244e59a5651c23359661.jpg', weight: '180 г', category: 'Печенье фасованное' },
  { id: '3138', img: 'https://kdv-group.com/uploads/catalog-offer/85aae3690182858fd069036f205680c2.jpg', weight: '200мл', category: 'Сок' },
  { id: '3139', img: 'https://kdv-group.com/uploads/catalog-offer/066abf9305745a26609a61a616a63021.jpg', weight: '200мл', category: 'Сок' },
  { id: '3140', img: 'https://kdv-group.com/uploads/catalog-offer/32bb44e4aba54244905ab1bc4c0ea0b4.jpg', weight: '200мл', category: 'Сок' },
  { id: '3141', img: 'https://kdv-group.com/uploads/catalog-offer/a6c53af3d123418707633ea4ae79d580.jpg', weight: '200мл', category: 'Нектар' },
  { id: '3142', img: 'https://kdv-group.com/uploads/catalog-offer/9a602744a4be13dca11293e07deada07.jpg', weight: '200мл', category: 'Нектар' },
  { id: '3143', img: 'https://kdv-group.com/uploads/catalog-offer/da1ef54b3972a0aa3ec9b6b21e4fb876.jpg', weight: '200мл', category: 'Нектар' },
  { id: '3509', img: 'https://kdv-group.com/uploads/catalog-offer/873debaa6a8eafea80f220634761f612.jpg', weight: '200мл', category: 'Нектар' },
  { id: '3574', img: 'https://kdv-group.com/uploads/catalog-offer/34dd3a938c7dbe57d98b092f6f117fcc.jpg', weight: '25 г', category: 'Чай травяной' }
];

async function fetchOne(item) {
  return new Promise((resolve) => {
    https.get('https://kdv-group.com/ru/catalog/offer/' + item.id, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const titleMatch = data.match(/<title>([^<]+)<\/title>/i);
        const descMatch = data.match(/<div class="[^"]*offer-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const name = titleMatch ? titleMatch[1].replace(/&mdash;|\| KDV/g, '').trim() : '';
        const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        resolve({ ...item, name, desc });
      });
    }).on('error', () => resolve(item));
  });
}

async function main() {
  const results = await Promise.all(offerData.map(fetchOne));
  fs.writeFileSync('scripts/bondi_parsed.json', JSON.stringify(results, null, 2));
  console.log('Saved scripts/bondi_parsed.json with ' + results.length + ' items');
  results.forEach(r => console.log(`[${r.category}] (${r.weight}) ${r.name}`));
}

main();
