import { Product } from '../types';

/**
 * Exact brand packaging match database - Cleared as per user request
 */
const VERIFIED_EXACT_BRAND_PACKAGING: Array<{ match: RegExp; img: string }> = [];

/**
 * Validates whether a product has a valid product photo URL.
 */
export function hasValidProductImage(product?: {
  image?: string;
  imageUrl?: string;
  photo?: string;
  photoUrl?: string;
  images?: string[];
  imageCandidates?: Array<{ imageUrl?: string }>;
  [key: string]: any;
} | null): boolean {
  if (!product) return false;
  let rawUrl = (
    product.image ||
    product.imageUrl ||
    product.photo ||
    product.photoUrl ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '') ||
    (Array.isArray(product.imageCandidates) && product.imageCandidates.length > 0 ? product.imageCandidates[0]?.imageUrl : '') ||
    ''
  );
  if (typeof rawUrl !== 'string') return false;
  rawUrl = rawUrl.trim();
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
    rawUrl.startsWith('/') ||
    rawUrl.startsWith('./')
  );
}

/**
 * Returns authentic product image URL.
 * Shows direct product image or candidate image if available.
 */
export function getAutoProductImage(product?: {
  image?: string;
  imageUrl?: string;
  photo?: string;
  photoUrl?: string;
  images?: string[];
  imageCandidates?: Array<{ imageUrl?: string }>;
  nameUz?: string;
  nameRu?: string;
  nameEn?: string;
  brand?: string;
  description?: string;
  categoryId?: string;
  [key: string]: any;
} | null): string {
  if (!product) return '';

  // 1. Direct or assigned image on product
  const directUrl = (
    product.image ||
    product.imageUrl ||
    product.photo ||
    product.photoUrl ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '') ||
    (Array.isArray(product.imageCandidates) && product.imageCandidates.length > 0 ? product.imageCandidates[0]?.imageUrl : '') ||
    ''
  );

  if (typeof directUrl === 'string' && directUrl.trim() && hasValidProductImage(product)) {
    return directUrl.trim();
  }

  // 2. Exact Brand Packaging match
  const searchCorpus = ` ${product.nameUz || ''} ${product.nameRu || ''} ${product.nameEn || ''} ${product.brand || ''} `.toLowerCase();
  for (const entry of VERIFIED_EXACT_BRAND_PACKAGING) {
    if (entry.match.test(searchCorpus)) {
      return entry.img;
    }
  }

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
