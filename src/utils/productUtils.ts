import { Product } from '../types';

/**
 * Returns a high quality image or auto icon based on product keywords, category, or description.
 * If user or admin provides an image URL or data URL, it will be preserved.
 */
export function getAutoProductImage(product: {
  image?: string;
  nameUz?: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  categoryId?: string;
}): string {
  // If custom valid image provided, use it
  if (
    product.image &&
    product.image.trim() !== '' &&
    !product.image.includes('placeholder_broken')
  ) {
    return product.image;
  }

  const text = `${product.nameUz || ''} ${product.nameRu || ''} ${product.nameEn || ''} ${product.description || ''} ${product.categoryId || ''}`.toLowerCase();

  // 1. Clothing & Apparel (Kiyim-kechak, Kiyim, Futbolka, Shim, Ko'ynak, Kurtka, Krossovka, Shirt, Shoes, Pants, etc.)
  if (
    text.includes('kiyim') ||
    text.includes('futbolka') ||
    text.includes('shim') ||
    text.includes('ko\'ynak') ||
    text.includes('kurtka') ||
    text.includes('krossovka') ||
    text.includes('paypoq') ||
    text.includes('shirt') ||
    text.includes('pants') ||
    text.includes('dress') ||
    text.includes('shoes') ||
    text.includes('apparel') ||
    text.includes('libos') ||
    text.includes('poyabzal')
  ) {
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80';
  }

  // 2. Stationery & Office Supplies (Kans, Kanselyariya, Notebook, Pen, Paper, Daftar, Ruchka, Kitob, Qalam)
  if (
    text.includes('kans') ||
    text.includes('daftar') ||
    text.includes('ruchka') ||
    text.includes('qalam') ||
    text.includes('kitob') ||
    text.includes('qog\'oz') ||
    text.includes('papka') ||
    text.includes('albom') ||
    text.includes('pen') ||
    text.includes('notebook') ||
    text.includes('stationery') ||
    text.includes('paper')
  ) {
    return 'https://images.unsplash.com/photo-1585336261026-8f5786372966?auto=format&fit=crop&w=400&q=80';
  }

  // 3. Drinks & Beverages (Ichimlik, Suv, Cola, Fanta, Pepsi, Sharbat, Tea, Choy, Coffee, Kofe)
  if (
    text.includes('ichimlik') ||
    text.includes('cola') ||
    text.includes('fanta') ||
    text.includes('pepsi') ||
    text.includes('suv') ||
    text.includes('sharbat') ||
    text.includes('tea') ||
    text.includes('choy') ||
    text.includes('kofe') ||
    text.includes('drink') ||
    text.includes('cat_drinks')
  ) {
    return 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=400&q=80';
  }

  // 4. Dairy (Sut, Pishloq, Tvorog, Qaymoq, Milk, Cheese, Dairy)
  if (
    text.includes('sut') ||
    text.includes('pishloq') ||
    text.includes('tvorog') ||
    text.includes('qaymoq') ||
    text.includes('milk') ||
    text.includes('cheese') ||
    text.includes('cat_dairy')
  ) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80';
  }

  // 5. Fruits & Vegetables (Meva, Sabzavot, Olma, Banan, Pomidor, Apple, Fruit, Veggie)
  if (
    text.includes('meva') ||
    text.includes('sabzavot') ||
    text.includes('olma') ||
    text.includes('banan') ||
    text.includes('pomidor') ||
    text.includes('apple') ||
    text.includes('fruit') ||
    text.includes('cat_fruits')
  ) {
    return 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80';
  }

  // 6. Grocery (Shakar, Guruch, Un, Yog', Sugar, Rice, Oil, Grocery)
  if (
    text.includes('shakar') ||
    text.includes('guruch') ||
    text.includes('un') ||
    text.includes('yog\'') ||
    text.includes('rice') ||
    text.includes('sugar') ||
    text.includes('oil') ||
    text.includes('cat_grocery')
  ) {
    return 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=400&q=80';
  }

  // 7. Snacks & Sweets (Chips, Shokolad, Konfet, Snek, Cookie, Candy)
  if (
    text.includes('chips') ||
    text.includes('shokolad') ||
    text.includes('konfet') ||
    text.includes('snek') ||
    text.includes('cookie') ||
    text.includes('chocolate') ||
    text.includes('cat_snacks')
  ) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80';
  }

  // 8. Electronics & Gadgets (Telefon, Quloqchin, Zaryadnik, Kompyuter, Sichqoncha, Phone, Tech, Cables)
  if (
    text.includes('telefon') ||
    text.includes('quloqchin') ||
    text.includes('zaryad') ||
    text.includes('kompyuter') ||
    text.includes('sichqoncha') ||
    text.includes('kabel') ||
    text.includes('phone') ||
    text.includes('laptop') ||
    text.includes('gadget') ||
    text.includes('tech')
  ) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80';
  }

  // 9. Household & Hygiene (Sovun, Shampun, Poroshok, Salfetka, Gel, Cleaning, Hygiene)
  if (
    text.includes('sovun') ||
    text.includes('shampun') ||
    text.includes('poroshok') ||
    text.includes('salfetka') ||
    text.includes('gel') ||
    text.includes('tozalash') ||
    text.includes('muloqot') ||
    text.includes('soap') ||
    text.includes('hygiene')
  ) {
    return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80';
  }

  // 10. Bakery & Bread (Non, Patir, Bulkash, Tort, Pirojniy, Bread, Bakery)
  if (
    text.includes('non') ||
    text.includes('patir') ||
    text.includes('bulochka') ||
    text.includes('tort') ||
    text.includes('pirojniy') ||
    text.includes('bread') ||
    text.includes('bakery')
  ) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80';
  }

  // 11. Meat & Sausage (Go'sht, Kolbasa, Sosiska, Qiyma, Tovuq, Meat, Sausage)
  if (
    text.includes('go\'sht') ||
    text.includes('gosht') ||
    text.includes('kolbasa') ||
    text.includes('sosiska') ||
    text.includes('qiyma') ||
    text.includes('tovuq') ||
    text.includes('meat') ||
    text.includes('sausage')
  ) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80';
  }

  // Default clean generic placeholder image URL
  return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80';
}

/**
 * Calculates total stock across all branches or for a specific branch
 */
export function getTotalStock(product: Product, branchId?: string): number {
  if (!product.stockByBranch) return 0;
  if (branchId) {
    return Number(product.stockByBranch[branchId]) || 0;
  }
  const stockValues = Object.values(product.stockByBranch) as number[];
  return stockValues.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
}

/**
 * Checks if product is in stock
 */
export function isProductInStock(product: Product, branchId?: string): boolean {
  return getTotalStock(product, branchId) > 0;
}
