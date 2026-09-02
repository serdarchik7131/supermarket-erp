import React, { useState, useEffect } from 'react';
import { Package, Cookie, Cake, Sparkles, CupSoda, Shirt, BookOpen, Apple, Milk, Utensils, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { getAutoProductImage } from '../../utils/productUtils';

interface ProductThumbnailProps {
  product?: Partial<Product> | null;
  className?: string;
  iconSize?: string;
  imgClassName?: string;
}

export const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  product,
  className = 'w-full h-full',
  iconSize = 'w-6 h-6',
  imgClassName = 'w-full h-full object-contain',
}) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getAutoProductImage(product);

  // Reset error state when product or image URL changes
  useEffect(() => {
    setHasError(false);
  }, [imageUrl, product?.id]);

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt={product?.nameUz || product?.nameRu || 'Product'}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        loading="lazy"
        decoding="async"
        className={imgClassName}
        onError={() => setHasError(true)}
      />
    );
  }

  // Determine appropriate vector icon based on category/name
  const cat = (product?.categoryId || '').toLowerCase();
  const name = (product?.nameUz || product?.nameRu || '').toLowerCase();

  let IconComponent = Package;
  let bgGradient = 'bg-gradient-to-br from-emerald-50 to-teal-100/60 text-emerald-600 border-emerald-200/50';

  if (cat.includes('cookie') || cat.includes('biscuit') || name.includes('pechenye') || name.includes('biskvit')) {
    IconComponent = Cookie;
    bgGradient = 'bg-gradient-to-br from-amber-50 to-orange-100/60 text-amber-600 border-amber-200/50';
  } else if (cat.includes('cake') || name.includes('tort') || name.includes('keks') || name.includes('pirojnoye')) {
    IconComponent = Cake;
    bgGradient = 'bg-gradient-to-br from-rose-50 to-pink-100/60 text-rose-600 border-rose-200/50';
  } else if (cat.includes('cand') || cat.includes('choc') || cat.includes('sweet') || name.includes('shokolad') || name.includes('konfet') || name.includes('karamel')) {
    IconComponent = Sparkles;
    bgGradient = 'bg-gradient-to-br from-purple-50 to-indigo-100/60 text-purple-600 border-purple-200/50';
  } else if (cat.includes('drink') || cat.includes('juice') || cat.includes('nectar') || cat.includes('tea') || name.includes('ichimlik') || name.includes('sharbat') || name.includes('choy') || name.includes('sok')) {
    IconComponent = CupSoda;
    bgGradient = 'bg-gradient-to-br from-sky-50 to-cyan-100/60 text-sky-600 border-sky-200/50';
  } else if (cat.includes('apparel') || name.includes('futbolka') || name.includes('kiyim')) {
    IconComponent = Shirt;
    bgGradient = 'bg-gradient-to-br from-blue-50 to-indigo-100/60 text-blue-600 border-blue-200/50';
  } else if (cat.includes('stationery') || name.includes('daftar') || name.includes('ruchka')) {
    IconComponent = BookOpen;
    bgGradient = 'bg-gradient-to-br from-amber-50 to-yellow-100/60 text-amber-700 border-amber-200/50';
  } else if (cat.includes('fruit') || cat.includes('puree') || name.includes('olma') || name.includes('banan')) {
    IconComponent = Apple;
    bgGradient = 'bg-gradient-to-br from-emerald-50 to-green-100/60 text-emerald-600 border-emerald-200/50';
  } else if (cat.includes('dairy') || name.includes('sut') || name.includes('pishloq')) {
    IconComponent = Milk;
    bgGradient = 'bg-gradient-to-br from-cyan-50 to-blue-100/60 text-cyan-600 border-cyan-200/50';
  } else if (cat.includes('snack') || cat.includes('waffle') || name.includes('vafli') || name.includes('kreker')) {
    IconComponent = Utensils;
    bgGradient = 'bg-gradient-to-br from-orange-50 to-amber-100/60 text-orange-600 border-orange-200/50';
  } else {
    IconComponent = ShoppingBag;
    bgGradient = 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 border-slate-200';
  }

  return (
    <div className={`flex flex-col items-center justify-center rounded-xl p-1.5 border shadow-2xs ${bgGradient} ${className}`}>
      <IconComponent className={`${iconSize} stroke-[2] drop-shadow-2xs`} />
      <span className="text-[9px] font-bold tracking-tight uppercase mt-0.5 opacity-80 select-none text-center line-clamp-1">
        {product?.brand || 'PROD'}
      </span>
    </div>
  );
};
