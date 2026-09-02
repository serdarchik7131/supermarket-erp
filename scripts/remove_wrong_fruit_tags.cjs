const fs = require('fs');

const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));

const nonFoodKeywords = [
  'pasta', 'tish', 'dr.clinic', 'dental', 'kilka', 'shprot', 'tushonka', 'go\'sht',
  'sovun', 'milo', 'shampun', 'shampoo', 'ariel', 'tide', 'persil', 'fairy',
  'poroshok', 'gel', 'krem', 'pampers', 'taglik', 'salfetka', 'chistol',
  'domestos', 'vanish', 'comfort', 'lenor', 'parfume', 'dezodorant', 'nivea',
  'dove', 'garnier', 'colgate', 'blend-a-med', 'oral-b', 'sensodyne', 'palmolive',
  'safeguard', 'duru', 'fax', 'syoss', 'gliss kur', 'clear', 'head & shoulders'
];

let cleanedCount = 0;
const updated = products.map(p => {
  let nameUz = p.nameUz || '';
  let nameRu = p.nameRu || '';
  const lower = nameUz.toLowerCase();

  // Check if non-beverage
  const isNonBeverage = nonFoodKeywords.some(k => lower.includes(k));
  if (isNonBeverage) {
    const beforeUz = nameUz;
    // Remove fruit flavor suffixes like (Olma), (Shaftoli), (Apelsin), (Olcha), (Gilos), etc.
    nameUz = nameUz.replace(/\s*\((Olma|Shaftoli|Apelsin|Olcha|Gilos|O'rik|Abrikos|Olxo'ri|Sliva|Anor|Banan|Kivi|Ananas|Qulupnay|Limon|Nok)\)/gi, '').trim();
    nameRu = nameRu.replace(/\s*\((Яблоко|Персик|Апельсин|Вишня|Черешня|Абрикос|Слива|Гранат|Банан|Киви|Ананас|Клубника|Лимон|Груша)\)/gi, '').trim();
    if (beforeUz !== nameUz) {
      cleanedCount++;
    }
  }

  return {
    ...p,
    nameUz,
    nameRu,
  };
});

console.log(`Cleaned fruit tags from ${cleanedCount} non-beverage products.`);
fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(updated, null, 2), 'utf8');
console.log('✅ Updated src/data/all_clean_products.json successfully!');
