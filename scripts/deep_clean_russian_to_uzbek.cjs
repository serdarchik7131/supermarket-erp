const fs = require('fs');

const dictionary = [
  // Grocery & Food
  { ru: /КРУПА\s+ГРЕЧНЕВАЯ|ГРЕЧНЕВАЯ\s+КРУПА|ГРЕЧКА/gi, uz: 'Grechka yormasi' },
  { ru: /КРУПА\s+МАННАЯ|МАННАЯ\s+КРУПА|МАНКА/gi, uz: 'Manna yormasi' },
  { ru: /КРУПА\s+ПШЕНИЧНАЯ/gi, uz: 'Bug\'doy yormasi' },
  { ru: /КРУПА\s+ПЕРЛОВАЯ|ПЕРЛОВКА/gi, uz: 'Arpa yormasi (Perlovka)' },
  { ru: /КРУПА\s+КУКУРУЗНАЯ/gi, uz: 'Makkajo\'xori yormasi' },
  { ru: /КРУПА\s+ОТСЯНАЯ|ОВСЯНЫЕ\s+ХЛОПЬЯ|ОВСЯНКА/gi, uz: 'Suli yormasi (Ovsianka)' },
  { ru: /КРУПА/gi, uz: 'Yorma' },
  { ru: /МАКАРОННЫЕ\s+ИЗДЕЛИЯ|МАКАРОНЫ/gi, uz: 'Makaron' },
  { ru: /МУКА\s+ПШЕНИЧНАЯ|МУКА/gi, uz: 'Bug\'doy uni' },
  { ru: /МАСЛО\s+ПОДСОЛНЕЧНОЕ/gi, uz: 'Kungaboqar yog\'i' },
  { ru: /МАСЛО\s+РАСТИТЕЛЬНОЕ/gi, uz: 'O\'simlik yog\'i' },
  { ru: /МАСЛО\s+СЛИВОЧНОЕ/gi, uz: 'Sariyog\'' },
  { ru: /МАСЛО\s+ОЛИВКОВОЕ/gi, uz: 'Zaytun yog\'i' },
  { ru: /МАСЛО\s+ХЛОПКОВОЕ/gi, uz: 'Paxta yog\'i' },
  { ru: /МАСЛО/gi, uz: 'Yog\'' },
  { ru: /САХАРНЫЙ\s+ПЕСОК|САХАР/gi, uz: 'Shakar' },
  { ru: /СОЛЬ\s+ПОВАРЕННАЯ|СОЛЬ/gi, uz: 'Osh tuzi' },
  { ru: /КУРТ/gi, uz: 'Qurt' },
  { ru: /СЫР\s+ПЛАВЛЕНЫЙ|ПЛАВЛЕНЫЙ\s+СЫР/gi, uz: 'Eritilgan pishloq' },
  { ru: /СЫР\s+ТВЕРДЫЙ|ТВЕРДЫЙ\s+СЫР|СЫР/gi, uz: 'Pishloq' },
  { ru: /ТВОРОГ/gi, uz: 'Tvorog' },
  { ru: /СМЕТАНА/gi, uz: 'Smetana (Qaymoq)' },
  { ru: /КЕФИР/gi, uz: 'Kefir (Qatiq)' },
  { ru: /МОЛОКО\s+СГУЩЕННОЕ|СГУЩЕНКА/gi, uz: 'Quyuqlashtirilgan sut (Sgushonka)' },
  { ru: /МОЛОКО/gi, uz: 'Sut' },
  { ru: /КОЛБАСА\s+ВАРИНАЯ|ВАРИНАЯ\s+КОЛБАСА/gi, uz: 'Pishirilgan kolbasa' },
  { ru: /КОЛБАСА\s+ПОЛУКОПЧЕНАЯ|ПОЛУКОПЧЕНАЯ\s+КОЛБАСА/gi, uz: 'Yarim dudlangan kolbasa' },
  { ru: /КОЛБАСА\s+СЫРОКОПЧЕНАЯ/gi, uz: 'Dudlangan kolbasa' },
  { ru: /КОЛБАСА/gi, uz: 'Kolbasa' },
  { ru: /СОСИСКИ/gi, uz: 'Sosiska' },
  { ru: /САРДЕЛЬКИ/gi, uz: 'Sardelka' },
  { ru: /МАЙОНЕЗ/gi, uz: 'Mayonez' },
  { ru: /КЕТЧУП/gi, uz: 'Ketchup' },
  { ru: /ТОМАТНАЯ\s+ПАСТА/gi, uz: 'Pomidor pastasi' },
  { ru: /ПРИПРАВА|СПЕЦИИ/gi, uz: 'Ziravorlar' },
  { ru: /ЧАЙ\s+ЧЕРНЫЙ/gi, uz: 'Qora choy' },
  { ru: /ЧАЙ\s+ЗЕЛЕНЫЙ/gi, uz: 'Ko\'k choy' },
  { ru: /ЧАЙ/gi, uz: 'Choy' },
  { ru: /КОФЕ\s+РАСТВОРИМЫЙ/gi, uz: 'Eruvchan qahva' },
  { ru: /КОФЕ\s+В\s+ЗЕРНАХ/gi, uz: 'Donador qahva' },
  { ru: /КОФЕ/gi, uz: 'Qahva' },
  { ru: /КАКАО/gi, uz: 'Kakao' },
  { ru: /ДЖЕМ|ВАРЕНЬЕ/gi, uz: 'Murabbo (Jem)' },
  { ru: /МЕД\s+НАТУРАЛЬНЫЙ|МЕД/gi, uz: 'Tabiiy asal' },

  // Non-Food & Personal Care
  { ru: /КОЛГОТКИ\s+ДЕТСКИЕ|КОЛГОТКИ/gi, uz: 'Bolalar kolgotkasi' },
  { ru: /НОСКИ\s+МУЖСКИЕ|НОСКИ\s+ЖЕНСКИЕ|НОСКИ\s+ДЕТСКИЕ|НОСКИ/gi, uz: 'Paypoq' },
  { ru: /ЗУБНАЯ\s+ПАСТА/gi, uz: 'Tish pastasi' },
  { ru: /ЗУБНАЯ\s+ЩЕТКА/gi, uz: 'Tish cho\'tkasi' },
  { ru: /ШАМПУНЬ\s+ДЛЯ\s+ВОЛОС|ШАМПУНЬ/gi, uz: 'Soch shampuni' },
  { ru: /БАЛЬЗАМ\s+ДЛЯ\s+ВОЛОС|БАЛЬЗАМ/gi, uz: 'Soch balzami' },
  { ru: /ГЕЛЬ\s+ДЛЯ\s+ДУША/gi, uz: 'Dush geli' },
  { ru: /МЫЛО\s+ЖИДКОЕ/gi, uz: 'Suyuq sovun' },
  { ru: /МЫЛО\s+ТУАЛЕТНОЕ|МЫЛО/gi, uz: 'Atir sovun' },
  { ru: /ДЕЗОДОРАНТ|АНТИПЕРСПИРАНТ/gi, uz: 'Dezodorant' },
  { ru: /ТУАЛЕТНАЯ\s+БУМАГА/gi, uz: 'Tualet qog\'ozi' },
  { ru: /САЛФЕТКИ\s+ВЛАЖНЫЕ/gi, uz: 'Nam salfetkalar' },
  { ru: /САЛФЕТКИ\s+БУМАЖНЫЕ|САЛФЕТКИ/gi, uz: 'Salfetkalar' },
  { ru: /ПОДГУЗНИКИ|ПАМПЕРСЫ/gi, uz: 'Bolalar tagligi (Pampers)' },
  { ru: /СТИРАЛЬНЫЙ\s+ПОРОШОК|ПОРОШОК\s+СТИРАЛЬНЫЙ|ПОРОШОК/gi, uz: 'Kir yuvish kukuni' },
  { ru: /ГЕЛЬ\s+ДЛЯ\s+СТИРКИ/gi, uz: 'Kir yuvish geli' },
  { ru: /КОНДИЦИОНЕР\s+ДЛЯ\s+БЕЛЬЯ|ОПОЛАСКИВАТЕЛЬ/gi, uz: 'Kiyim yumshatgich (Konditsioner)' },
  { ru: /СРЕДСТВО\s+ДЛЯ\s+МЫТЬЯ\s+ПОСУДЫ|ДЛЯ\s+ПОСУДЫ/gi, uz: 'Idish yuvish vositasi' },
  { ru: /ОСВЕЖИТЕЛЬ\s+ВОЗДУХА/gi, uz: 'Xona xushbo\'ylantirgichi' },
  { ru: /ГУБКИ\s+ДЛЯ\s+ПОСУДЫ|ГУБКА/gi, uz: 'Idish yuvish gubkasi' },
  { ru: /ПАКЕТЫ\s+ДЛЯ\s+МУСОРА/gi, uz: 'Chiqindi xaltasi' },
  { ru: /ФОЛЬГА\s+АЛЮМИНИЕВАЯ/gi, uz: 'Alyuminiy folga' },
  { ru: /ПЛЕНКА\s+ПИЩЕВАЯ/gi, uz: 'Oziq-ovqat plyonkasi' },

  // Packaging & Quantities
  { ru: /(\d+)\s*ПАКЕТОВ|(\d+)\s*ПАКЕТА/gi, uz: '$1 dona paket' },
  { ru: /(\d+)\s*ШТУК|(\d+)\s*ШТ/gi, uz: '$1 dona' },
  { ru: /ПАКЕТ/gi, uz: 'Paket' },
  { ru: /УПАКОВКА/gi, uz: 'Qadoq' },
  { ru: /КОРОБКА/gi, uz: 'Quti' },
  { ru: /БАНОЧКА/gi, uz: 'Banka' },
  { ru: /БУТЫЛКА/gi, uz: 'Idish' },
];

const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));

let translatedCount = 0;
const fullyCleaned = products.map(p => {
  let nameUz = p.nameUz || '';
  const original = nameUz;

  // Apply dictionary transformations
  dictionary.forEach(entry => {
    nameUz = nameUz.replace(entry.ru, entry.uz);
  });

  // Clean formatting
  nameUz = nameUz
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

  // If mostly uppercase Cyrillic remains, title case words
  if (/[А-ЯЁ]{3,}/.test(nameUz)) {
    nameUz = nameUz
      .split(' ')
      .map(w => {
        if (/^[А-ЯЁ]+$/.test(w) && w.length > 1) {
          return w.charAt(0) + w.slice(1).toLowerCase();
        }
        return w;
      })
      .join(' ');
  }

  if (nameUz !== original) {
    translatedCount++;
  }

  return {
    ...p,
    nameUz,
  };
});

console.log(`Deep cleaned and Uzbekized ${translatedCount} product names!`);
fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(fullyCleaned, null, 2), 'utf8');
console.log('✅ Updated src/data/all_clean_products.json successfully!');
