import { Product } from '../types';

/**
 * Exact brand packaging match database - Cleared as per user request
 */
const VERIFIED_EXACT_BRAND_PACKAGING: Array<{ match: RegExp; img: string }> = [];

/**
 * Validates whether a product has a valid product photo URL.
 */
export function hasValidProductImage(product?: { image?: string; imageUrl?: string } | null): boolean {
  if (!product) return false;
  const rawUrl = (product.image || product.imageUrl || '').trim();
  if (!rawUrl) return false;

  // Filter out non-image files or broken markers
  if (
    rawUrl.includes('logo-container') ||
    rawUrl.includes('logo-panda') ||
    rawUrl.includes('placeholder') ||
    rawUrl.endsWith('.pdf') ||
    rawUrl.endsWith('.mp4')
  ) {
    return false;
  }

  return (
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://') ||
    rawUrl.startsWith('data:image/') ||
    rawUrl.startsWith('/')
  );
}

/**
 * Returns authentic product image URL ONLY if 100% verified.
 * If not 100% verified to the brand/product, returns empty string so the clean category vector badge is shown.
 */
export function getAutoProductImage(product?: {
  image?: string;
  imageUrl?: string;
  nameUz?: string;
  nameRu?: string;
  nameEn?: string;
  brand?: string;
  description?: string;
  categoryId?: string;
} | null): string {
  if (!product) return '';

  // 1. Direct verified image on product
  const directUrl = (product.image || product.imageUrl || '').trim();
  if (hasValidProductImage(product)) {
    return directUrl;
  }

  // 2. Exact 100% Verified Brand Packaging match ONLY
  const searchCorpus = ` ${product.nameUz || ''} ${product.nameRu || ''} ${product.nameEn || ''} ${product.brand || ''} `.toLowerCase();
  for (const entry of VERIFIED_EXACT_BRAND_PACKAGING) {
    if (entry.match.test(searchCorpus)) {
      return entry.img;
    }
  }

  // 3. Do NOT show unverified random images. Return empty string so UI renders the elegant vector icon badge.
  return '';
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
