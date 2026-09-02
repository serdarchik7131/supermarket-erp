const fs = require('fs');

function titleCaseUz(str) {
  if (!str) return '';
  return str
    .split(' ')
    .map(w => {
      if (w.startsWith('(') && w.length > 1) {
        return '(' + w.charAt(1).toUpperCase() + w.slice(2);
      }
      if (['va', 'bilan', 'uchun', 'dona', 'kg', 'g', 'l', 'ml'].includes(w.toLowerCase())) {
        return w.toLowerCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function cleanAndPerfectProduct(p) {
  let u = (p.nameUz || p.nameRu || '').trim();
  let r = (p.nameRu || p.nameUz || '').trim();
  let brand = (p.brand || '').trim();

  // 1. Remove weird symbols
  u = u.replace(/&#8217;/g, "'").replace(/&amp;/g, '&').replace(/«|»|"/g, '').replace(/\$/g, '').trim();
  r = r.replace(/&#8217;/g, "'").replace(/&amp;/g, '&').replace(/«|»|"/g, '').replace(/\$/g, '').trim();

  // 2. Specific SFAD naming accuracy
  if (u.includes('5*5=?') || u.includes('5x5=?') || u.includes('5*5') || u.includes('5x5')) {
    u = 'SFAD 5x5=? Shokoladli Pechenye';
    r = 'Сахарное печенье SFAD 5x5=? Choco в шоколаде';
    brand = 'SFAD';
  } else if (u.includes('Kulchaning kengligi') || r.includes('Kulchaning kengligi')) {
    u = 'SFAD Susan Shakarli Pechenye (Shaxmat)';
    r = 'Сахарное печенье SFAD Сюзан Шахмат';
    brand = 'SFAD';
  } else if (u.includes('Turk Kehvesi') || u.includes('Turk Qahvasi')) {
    u = 'SFAD Turk Qahvasi Shakarli Pechenye';
    r = 'Сахарное печенье SFAD Турецкий Кофе';
    brand = 'SFAD';
  } else if (u.includes('Dubai подушки') || u.includes('Dubai yostiqcha') || u.includes('Dubai yostiq')) {
    u = 'SFAD Dubai Pistali Shokoladli Yostiqchalar';
    r = 'Хрустящие подушечки SFAD Dubai с фисташковым кремом';
    brand = 'SFAD';
  } else if (u.includes('Popkorn istaysizmi') || u.includes('Popcorn istaysizmi')) {
    u = 'SFAD Popkorn Karamelli Pishiriq';
    r = 'Карамельный попкорн SFAD';
    brand = 'SFAD';
  } else if (u === 'Galet' || u.startsWith('Galet ')) {
    u = 'SFAD Galeta Shakarli Qandolat Pechenyesi';
    r = 'Галетное печенье SFAD';
    brand = 'SFAD';
  } else if (u === 'Завтрак' || u === 'Zavtrak') {
    u = 'SFAD Zavtrak Shakarli Pechenye';
    r = 'Сахарное печенье SFAD Завтрак';
    brand = 'SFAD';
  } else if (u === 'Подушки сладкие' || u === 'Podushki sladkie') {
    u = 'SFAD Shokoladli Qarsildoq Yostiqchalar';
    r = 'Хрустящие сладкие подушечки SFAD с шоколадом';
    brand = 'SFAD';
  } else if (u === 'Палочки сладкие' || u === 'Palochki sladkie') {
    u = 'SFAD Shirin Glazurli Tayoqchalar';
    r = 'Сладкие глазированные палочки SFAD';
    brand = 'SFAD';
  } else if (u === 'Палочки с кунжутом' || u === 'Palochki s kunjutom') {
    u = 'SFAD Kunjutli Qarsildoq Tayoqchalar';
    r = 'Палочки с кунжутом SFAD';
    brand = 'SFAD';
  } else if (u === 'Палочки банан' || u === 'Palochki banan') {
    u = 'SFAD Bananli Glazurli Tayoqchalar';
    r = 'Банановые палочки в глазури SFAD';
    brand = 'SFAD';
  } else if (u === 'Mushrooms') {
    u = "SFAD Shokoladli Qo'ziqorin Pirojnoye (Mushrooms)";
    r = 'Печенье грибочки с шоколадной шляпкой SFAD Mushrooms';
    brand = 'SFAD';
  } else if (u === 'Sweet Pillows') {
    u = 'SFAD Shokoladli Qarsildoq Yostiqchalar (Sweet Pillows)';
    r = 'Хрустящие подушечки SFAD Sweet Pillows с шоколадной начинкой';
    brand = 'SFAD';
  } else if (u === 'Mimino') {
    u = 'SFAD Mimino Glazurli Galet Pechenyesi';
    r = 'Галетное печенье SFAD Мимино с кремовой глазурью';
    brand = 'SFAD';
  } else if (u === 'Veneto choco') {
    u = 'SFAD Veneto Shokolad Glazurli Pechenye';
    r = 'Сахарное печенье SFAD Венето в шоколадной глазури';
    brand = 'SFAD';
  } else if (u === 'Lochira choko' || u === 'Lochira choco') {
    u = 'SFAD Lochira Choco Kunjutli Glazurli Pechenye';
    r = 'Печенье SFAD Лочира Чоко с кунжутом в шоколадной глазури';
    brand = 'SFAD';
  } else if (u === 'Hello Kitty') {
    u = 'SFAD Hello Kitty Shokoladli Bolalar Pechenyesi';
    r = 'Детское печенье SFAD Hello Kitty в шоколаде';
    brand = 'SFAD';
  } else if (u === 'Bayram choco') {
    u = 'SFAD Bayram Choco Qaymoqli Vafli';
    r = 'Вафли SFAD Байрам Чоко с шоколадно-сливочным кремом';
    brand = 'SFAD';
  } else if (u === 'Mulya Krasotulya') {
    u = 'SFAD Mulya Krasotulya Bolalar Shakarli Pechenyesi';
    r = 'Детское печенье SFAD Муля Красотуля';
    brand = 'SFAD';
  } else if (u === 'Oq tulpor') {
    u = 'SFAD Oq Tulpor Shakarli Pechenye';
    r = 'Сахарное печенье SFAD Белый скакун (Ок тулпор)';
    brand = 'SFAD';
  } else if (u === 'Sunon') {
    u = 'SFAD Sunon Shakarli Pechenye';
    r = 'Сахарное печенье SFAD Сунон';
    brand = 'SFAD';
  } else if (u === 'Swiss') {
    u = 'SFAD Swiss Shakarli Pechenye';
    r = 'Сахарное печенье SFAD Свисс';
    brand = 'SFAD';
  } else if (u === 'Tvorozhnoye') {
    u = 'SFAD Tvorogli Shakarli Pechenye';
    r = 'Сахарное печенье SFAD Творожное';
    brand = 'SFAD';
  } else if (u === 'Ricota') {
    u = 'SFAD Rikotta Shokoladli Pechenye';
    r = 'Шоколадное печенье SFAD Рикотта';
    brand = 'SFAD';
  } else if (u === 'Toplyonoye Moloko') {
    u = 'SFAD Pishirilgan Sutli Pechenye (Toplyonoye Moloko)';
    r = 'Сахарное печенье SFAD Топленое молоко';
    brand = 'SFAD';
  }

  // 3. Translate Russian words in Uzbek Name (Uzbek standardization)
  if (/^[А-ЯЁ0-9\s.,/()+-]+$/.test(u) || /[а-яё]/i.test(u)) {
    let transU = u;
    // Common words
    transU = transU
      .replace(/НАПИТОК\s+ЭНЕРГЕТИЧЕСКИЙ|НАПИТОК\s+0,5\s*Л\.\s*ЭНЕРГЕТИЧЕСКИЙ|ЭНЕРГЕТИЧЕСКИЙ\s+НАПИТОК/gi, 'Energetik Ichimlik')
      .replace(/НАПИТОК\s+БЕЗАЛКОГОЛЬНЫЙ|НАПИТОК/gi, 'Ichimlik')
      .replace(/ЭНЕРГЕТИК/gi, 'Energetik Ichimlik')
      .replace(/СОК\s+НААТУРАЛЬНЫЙ|СОК/gi, 'Sharbat')
      .replace(/НЕКТАР/gi, 'Nektar')
      .replace(/ВОДА\s+МИНЕРАЛЬНАЯ|МИНЕРАЛЬНАЯ\s+ВОДА|МИНЕРАЛЬНАЯ/gi, 'Mineral Suv')
      .replace(/ВОДА\s+ПИТЬЕВАЯ|ВОДА\s+ГАЗИРОВАННАЯ|ВОДА\s+НЕГАЗИРОВАННАЯ|ВОДА/gi, 'Suv')
      .replace(/ПЕЧЕНЬЕ\s+САХАРНОЕ|САХАРНОЕ\s+ПЕЧЕНЬЕ|ПЕЧЕНЬЕ/gi, 'Pechenye')
      .replace(/ВАФЛИ/gi, 'Vafli')
      .replace(/КОНФЕТЫ\s+ШОКОЛАДНЫЕ|ШОКОЛАДНЫЕ\s+КОНФЕТЫ|КОНФЕТЫ/gi, 'Shokolad Konfetlar')
      .replace(/ШОКОЛАД\s+МОЛОЧНЫЙ|МОЛОЧНЫЙ\s+ШОКОЛАД|ШОКОЛАД/gi, 'Sutli Shokolad')
      .replace(/БАКАЛЕЯ/gi, 'Baqqollik')
      .replace(/МАСЛО\s+ПОДСОЛНЕЧНОЕ|МАСЛО\s+РАСТИТЕЛЬНОЕ|МАСЛО/gi, "O'simlik Yog'i")
      .replace(/МОЛОКО/gi, 'Sut')
      .replace(/КЕФИР/gi, 'Qatiq (Kefir)')
      .replace(/СМЕТАНА/gi, 'Qaymoq (Smetana)')
      .replace(/СЫР/gi, 'Pishloq')
      .replace(/ТВОРОГ/gi, 'Tvorog')
      .replace(/ЧАЙ\s+ЧЕРНЫЙ|ЧЕРНЫЙ\s+ЧАЙ/gi, 'Qora Choy')
      .replace(/ЧАЙ\s+ЗЕЛЕНЫЙ|ЗЕЛЕНЫЙ\s+ЧАЙ/gi, 'Ko\'k Choy')
      .replace(/КОФЕ/gi, 'Qahva')
      .replace(/СУХАРИКИ/gi, 'Suxariklar')
      .replace(/ЧИПСЫ/gi, 'Chipslar')
      .replace(/ГАЗИРОВАННАЯ/gi, 'Gazli')
      .replace(/НЕГАЗИРОВАННАЯ|БЕЗ\s*ГАЗА/gi, 'Gazsiz')
      .replace(/В\s+АССОРТИМЕНТЕ/gi, '(Assorti)')
      .replace(/С\s+САХАРОМ/gi, 'Shakarli')
      .replace(/БЕЗ\s+САХАРА/gi, 'Shakarsiz')
      .replace(/ЯБЛОКО/gi, 'Olma')
      .replace(/ПЕРСИК/gi, 'Shaftoli')
      .replace(/ВИШНЯ/gi, 'Olcha')
      .replace(/АПЕЛЬСИН/gi, 'Apelsin')
      .replace(/ГРАНАТ/gi, 'Anor')
      .replace(/ТОМАТ/gi, 'Pomidor')
      .replace(/КЛУБНИКА/gi, 'Qulupnay')
      .replace(/БАНАН/gi, 'Banan')
      .replace(/АНАНАС/gi, 'Ananas');

    // Clean packaging abbreviations
    transU = transU.replace(/ПЭТ|PET/gi, 'PET').replace(/Ж\/Б|ЖБ|ТЕМ\s*БАНКА/gi, '(Temir banka)').replace(/СТЕКЛО|ШИША/gi, '(Shisha)');
    u = transU;
  }

  // 4. Uniform volume & weight format
  u = u
    .replace(/(\d+),(\d+)\s*(л|l|литр|литров)/gi, '$1.$2L')
    .replace(/(\d+)\s*(л|l|литр|литров)/gi, '$1L')
    .replace(/(\d+)\s*(мл|ml)/gi, '$1ml')
    .replace(/(\d+),(\d+)\s*(кг|kg)/gi, '$1.$2kg')
    .replace(/(\d+)\s*(кг|kg)/gi, '$1kg')
    .replace(/(\d+)\s*(гр|гр\.|г|g)/gi, '$1g');

  r = r
    .replace(/(\d+),(\d+)\s*(л|l|литр|литров)/gi, '$1.$2л')
    .replace(/(\d+)\s*(л|l|литр|литров)/gi, '$1л')
    .replace(/(\d+)\s*(мл|ml)/gi, '$1мл')
    .replace(/(\d+),(\d+)\s*(кг|kg)/gi, '$1.$2кг')
    .replace(/(\d+)\s*(кг|kg)/gi, '$1кг')
    .replace(/(\d+)\s*(гр|гр\.|г|g)/gi, '$1г');

  // 5. Clean drink & snack specifics
  if (u.startsWith('18+') && !u.toLowerCase().includes('energetik')) {
    u = u.replace('18+', '18+ Energetik Ichimlik');
  }
  if (u.startsWith('Pepsi 0.5L') || u.startsWith('Pepsi 0,5L')) {
    u = 'Pepsi Gazli Ichimlik 0.5L PET';
  }
  if (u.startsWith('Pepsi 1.5L') || u.startsWith('Pepsi 1,5L')) {
    u = 'Pepsi Gazli Ichimlik 1.5L PET';
  }
  if (u.startsWith('Coca Cola Pet 0.5L') || u.startsWith('Coca Cola 0.5L') || u.startsWith('Coca-Cola 0.5L')) {
    u = 'Coca-Cola Gazli Ichimlik 0.5L PET';
  }
  if (u.startsWith('Coca Cola Pet 1.5L') || u.startsWith('Coca Cola 1.5L') || u.startsWith('Coca-Cola 1.5L')) {
    u = 'Coca-Cola Gazli Ichimlik 1.5L PET';
  }
  if (u.startsWith('Fanta 0.5L') || u.startsWith('Fanta Pet 0.5L')) {
    u = 'Fanta Apelsin Gazli Ichimlik 0.5L PET';
  }
  if (u.startsWith('Fanta 1.5L') || u.startsWith('Fanta Pet 1.5L')) {
    u = 'Fanta Apelsin Gazli Ichimlik 1.5L PET';
  }
  if (u.startsWith('Sprite 0.5L') || u.startsWith('Sprite Pet 0.5L')) {
    u = 'Sprite Gazli Ichimlik 0.5L PET';
  }
  if (u.startsWith('Sprite 1.5L') || u.startsWith('Sprite Pet 1.5L')) {
    u = 'Sprite Gazli Ichimlik 1.5L PET';
  }
  if (u.startsWith('UP SOKCHA')) {
    u = u.replace('UP SOKCHA', 'Up Bolalar Sharbati');
  }
  if (u.startsWith('VERANDA OLMA SIRKASI')) {
    u = 'Veranda Tabiiy Olma Sirkasi 250ml';
  }
  if (u.startsWith('VERANDA anor sousi 0.33L') || u.startsWith('Veranda anor sousi 0.33L')) {
    u = 'Veranda Tabiiy Anor Sousi (Narsharab) 0.33L';
  }
  if (u.startsWith('Veranda Anor Sousi 0.5L') || u.startsWith('Veranda Anor Sousi 0,5L')) {
    u = 'Veranda Tabiiy Anor Sousi (Narsharab) 0.5L';
  }
  if (u.startsWith('TUYA Pechenni')) {
    u = 'Tuya Qandolat Shakarli Pechenyesi (Kgli)';
    r = 'Сахарное печенье Туя весовое';
  }

  // 6. Fix brand names
  if (brand === 'Korzinka Go' || brand === 'Mahalliy Mahsulot' || !brand) {
    if (u.startsWith('Pepsi') || u.includes('Pepsi')) brand = 'Pepsi';
    else if (u.startsWith('Coca-Cola') || u.startsWith('Coca Cola') || u.includes('Coca-Cola')) brand = 'Coca-Cola';
    else if (u.startsWith('Fanta') || u.includes('Fanta')) brand = 'Fanta';
    else if (u.startsWith('Sprite') || u.includes('Sprite')) brand = 'Sprite';
    else if (u.startsWith('Borjomi') || u.includes('Borjomi')) brand = 'Borjomi';
    else if (u.startsWith('Flash') || u.includes('Flash')) brand = 'Flash Up';
    else if (u.startsWith('Dobriy') || u.includes('Dobriy')) brand = 'Dobriy';
    else if (u.startsWith('SFAD') || u.includes('SFAD')) brand = 'SFAD';
    else if (u.startsWith('KDV') || u.includes('KDV')) brand = 'KDV';
    else if (u.startsWith('Babyfox') || u.includes('Babyfox')) brand = 'Babyfox';
    else if (u.startsWith('Bondi') || u.includes('Bondi')) brand = 'Bondi';
    else if (u.startsWith('Panda') || u.includes('Panda')) brand = 'Panda';
    else if (u.startsWith('Krember') || u.includes('Krember')) brand = 'Krember';
    else if (u.startsWith('Tyan-Shan') || u.includes('Tyan-Shan')) brand = 'Tyan-Shan';
    else if (u.startsWith('Veranda') || u.includes('Veranda')) brand = 'Veranda';
    else if (u.startsWith('Yessentuki') || u.includes('Essentuki')) brand = 'Yessentuki';
    else if (u.startsWith('BonAqua') || u.includes('Bonaqua')) brand = 'BonAqua';
  }

  // Clean casing and extra spaces
  u = u.replace(/\s+/g, ' ').trim();
  r = r.replace(/\s+/g, ' ').trim();

  return {
    ...p,
    nameUz: u,
    nameRu: r,
    nameEn: p.nameEn || u,
    brand,
    description: `${u} — yuqori sifatli mahsulot.`,
  };
}

const products = JSON.parse(fs.readFileSync('src/data/all_clean_products.json', 'utf8'));
console.log('Original count:', products.length);

const cleaned = products.map(cleanAndPerfectProduct);

fs.writeFileSync('src/data/all_clean_products.json', JSON.stringify(cleaned, null, 2), 'utf8');
console.log('✅ Successfully cleaned and perfected all product names in src/data/all_clean_products.json!');
