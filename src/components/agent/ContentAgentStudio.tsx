import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Search,
  Scan,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Filter,
  RefreshCw,
  Edit3,
  Tag,
  Barcode,
  ArrowRight,
  FolderTree,
  ChevronRight,
  User,
  Zap,
  Sliders,
  Check,
  X,
  Play,
  List,
  Grid,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Product, Category, StaffMember } from '../../types';
import { fetchProducts, fetchCategories, updateProduct } from '../../services/api';
import { ProductStudioModal } from './ProductStudioModal';
import { ProductThumbnail } from '../common/ProductThumbnail';
import { matchProductSearch } from '../../utils/searchUtils';

interface ContentAgentStudioProps {
  currentAgent: StaffMember;
  onSwitchAgent?: (agent: StaffMember) => void;
  onLogoutOrExit?: () => void;
}

export const ContentAgentStudio: React.FC<ContentAgentStudioProps> = ({
  currentAgent,
  onSwitchAgent,
  onLogoutOrExit,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'unimaged' | 'imaged'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  // Selected product for editing modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stats
  const [todayEditedCount, setTodayEditedCount] = useState<number>(0);

  // Barcode Camera Scanner states
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState<boolean>(false);
  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const barcodeScanIntervalRef = useRef<any>(null);
  const [barcodeScanError, setBarcodeScanError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [prods, cats] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load products in Content Studio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy barcode helper
  const handleCopyBarcode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedBarcode(code);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  // Filter products based on search, category and image presence
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }

      const hasImg = !!(p.image || p.imageUrl);

      // Image presence filter
      if (filterMode === 'unimaged' && hasImg) {
        return false;
      }
      if (filterMode === 'imaged' && !hasImg) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const barcodeMatch = (p.barcode || '').toLowerCase().includes(query);
        const skuMatch = (p.sku || '').toLowerCase().includes(query);
        const nameMatch = matchProductSearch(p, query);
        return barcodeMatch || skuMatch || nameMatch;
      }

      return true;
    });
  }, [products, selectedCategory, filterMode, searchQuery]);

  // Statistics calculation
  const totalCount = products.length;
  const imagedCount = useMemo(() => {
    return products.filter((p) => !!(p.image || p.imageUrl)).length;
  }, [products]);
  const unimagedCount = totalCount - imagedCount;
  const progressPercent = totalCount > 0 ? Math.round((imagedCount / totalCount) * 100) : 0;

  // Handle product save
  const handleSaveProduct = async (updatedProduct: Product, andOpenNext: boolean = false) => {
    try {
      const saved = await updateProduct(updatedProduct.id, updatedProduct);

      // Update local state immediately
      setProducts((prev) =>
        prev.map((p) => (p.id === saved.id ? saved : p))
      );
      setTodayEditedCount((c) => c + 1);

      if (andOpenNext) {
        // Find next product without image
        const nextUnimaged = products.find(
          (p) => p.id !== saved.id && !(p.image || p.imageUrl)
        );
        if (nextUnimaged) {
          setEditingProduct(nextUnimaged);
        } else {
          setEditingProduct(null);
        }
      } else {
        setEditingProduct(null);
      }
    } catch (err) {
      console.error('Error saving product in studio:', err);
      throw err;
    }
  };

  // Start Conveyor Workflow
  const handleStartConveyor = () => {
    const firstUnimaged = products.find((p) => !(p.image || p.imageUrl));
    if (firstUnimaged) {
      setEditingProduct(firstUnimaged);
    }
  };

  // --- BARCODE SCANNER CAMERA LOGIC ---
  const startBarcodeScanner = async () => {
    setBarcodeScanError(null);
    setIsBarcodeScannerOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      barcodeStreamRef.current = stream;

      if (barcodeVideoRef.current) {
        barcodeVideoRef.current.srcObject = stream;
        await barcodeVideoRef.current.play();
      }

      // Check if native BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
        });

        barcodeScanIntervalRef.current = setInterval(async () => {
          if (!barcodeVideoRef.current) return;
          try {
            const barcodes = await detector.detect(barcodeVideoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detectedCode = barcodes[0].rawValue;
              handleBarcodeDetected(detectedCode);
            }
          } catch (e) {}
        }, 400);
      }
    } catch (err: any) {
      console.error('Barcode scanner camera error:', err);
      setBarcodeScanError('Kameraga ulanishda xatolik yuz berdi.');
    }
  };

  const stopBarcodeScanner = () => {
    if (barcodeScanIntervalRef.current) {
      clearInterval(barcodeScanIntervalRef.current);
      barcodeScanIntervalRef.current = null;
    }
    if (barcodeStreamRef.current) {
      barcodeStreamRef.current.getTracks().forEach((t) => t.stop());
      barcodeStreamRef.current = null;
    }
    if (barcodeVideoRef.current) {
      barcodeVideoRef.current.srcObject = null;
    }
    setIsBarcodeScannerOpen(false);
  };

  const handleBarcodeDetected = (code: string) => {
    stopBarcodeScanner();
    setSearchQuery(code);

    // Find product with this barcode
    const matched = products.find(
      (p) => (p.barcode || '').trim().toLowerCase() === code.trim().toLowerCase()
    );

    if (matched) {
      setEditingProduct(matched);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Top Header */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 sticky top-0 z-20 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Mahsulot Nom & Rasm Studiyasi
                </h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Kontent Agent
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-200 font-medium">{currentAgent.name}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-mono">Login: {currentAgent.login}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle (Ro'yxat / Setka) */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ro'yxat ko'rinishi (Jadval)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ro'yxat</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Setka ko'rinishi"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Setka</span>
              </button>
            </div>

            {onLogoutOrExit && (
              <button
                onClick={onLogoutOrExit}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all border border-slate-700 cursor-pointer"
              >
                Chiqish
              </button>
            )}
          </div>
        </div>

        {/* Catalog Progress Bar & Fast Conveyor Trigger */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Rasmlangan: <span className="text-emerald-400 font-mono">{imagedCount}</span> / {totalCount} ta
              </span>
              <span className="text-amber-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartConveyor}
              className="py-1.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              title="Rasmsiz tovarlarni ketma-ket ochib berish"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>⚡️ Konveyer Rejimi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/60 p-3 border-b border-slate-800 space-y-2.5">
        
        {/* Search Bar + Barcode Scanner Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nomi, shtrix-kodi yoki brendi orqali qidiring..."
              className="w-full bg-slate-950 text-xs text-white pl-10 pr-8 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={startBarcodeScanner}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 shadow-md shrink-0 transition-all cursor-pointer"
            title="Kameradan shtrix-kodni skanerlash"
          >
            <Scan className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Skaner</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar flex-1">
            <button
              onClick={() => setFilterMode('all')}
              className={`py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Barchasi ({totalCount})</span>
            </button>

            <button
              onClick={() => setFilterMode('unimaged')}
              className={`py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                filterMode === 'unimaged'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Rasmsizlar ({unimagedCount})</span>
            </button>

            <button
              onClick={() => setFilterMode('imaged')}
              className={`py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                filterMode === 'imaged'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Rasmli ({imagedCount})</span>
            </button>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 text-slate-300 text-xs py-1.5 px-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400 font-medium shrink-0 cursor-pointer"
            >
              <option value="all">Barcha kategoriyalar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameUz}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 shrink-0 font-medium">
            <span>Ko'rsatilmoqda:</span>
            <span className="text-amber-400 font-bold font-mono">{filteredProducts.length}</span>
            <span>ta tovar</span>
          </div>
        </div>

      </div>

      {/* Main Products Display (List or Grid) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-amber-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs font-bold">Mahsulotlar katalogi yuklanmoqda...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center space-y-2 p-6">
            <ImageIcon className="w-12 h-12 stroke-[1.5] text-slate-600" />
            <h3 className="text-sm font-bold text-slate-400">Mahsulot topilmadi</h3>
            <p className="text-xs text-slate-500">
              Qidiruv so'zini yoki filterlarni o'zgartirib ko'ring.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* ========================================================
             RO'YXAT KO'RINISHI (HIGH DENSITY TABULAR LIST VIEW)
             ======================================================== */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">Rasm</th>
                    <th className="py-3 px-3 min-w-[220px]">Mahsulot Nomi & Brend</th>
                    <th className="py-3 px-3 w-36 font-mono">Shtrix-kod</th>
                    <th className="py-3 px-3 w-36">Kategoriya</th>
                    <th className="py-3 px-3 w-28 text-right font-mono">Narx</th>
                    <th className="py-3 px-3 w-28 text-center">Holat</th>
                    <th className="py-3 px-3 w-32 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredProducts.slice(0, 200).map((product) => {
                    const hasImg = !!(product.image || product.imageUrl);
                    const categoryObj = categories.find((c) => c.id === product.categoryId);

                    return (
                      <tr
                        key={product.id}
                        onClick={() => setEditingProduct(product)}
                        className={`group hover:bg-slate-800/80 transition-colors cursor-pointer ${
                          !hasImg ? 'bg-amber-500/[0.02]' : ''
                        }`}
                      >
                        {/* 1. Thumbnail */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto shadow-inner group-hover:border-amber-400/50">
                            <ProductThumbnail
                              product={product}
                              className="w-full h-full object-contain p-1"
                            />
                            {!hasImg && (
                              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xs flex flex-col items-center justify-center text-amber-400">
                                <Camera className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Title & Brand */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 text-xs">
                              {product.nameUz || product.nameRu || 'Nomsiz tovar'}
                            </div>
                            {product.nameRu && product.nameRu !== product.nameUz && (
                              <div className="text-[10px] text-slate-400 line-clamp-1">
                                {product.nameRu}
                              </div>
                            )}
                            <div className="flex items-center gap-2 pt-0.5">
                              {product.brand ? (
                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/50">
                                  {product.brand}
                                </span>
                              ) : null}
                              {product.sku ? (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  SKU: {product.sku}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* 3. Barcode */}
                        <td className="py-2.5 px-3 font-mono">
                          {product.barcode ? (
                            <div
                              onClick={(e) => handleCopyBarcode(e, product.barcode!)}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 hover:border-amber-400 hover:text-white transition-colors cursor-pointer"
                              title="Nusxa olish"
                            >
                              <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-bold">{product.barcode}</span>
                              {copiedBarcode === product.barcode ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Mavjud emas</span>
                          )}
                        </td>

                        {/* 4. Category */}
                        <td className="py-2.5 px-3">
                          <span className="inline-block text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 truncate max-w-[140px]">
                            {categoryObj ? categoryObj.nameUz : 'Umumiy'}
                          </span>
                        </td>

                        {/* 5. Price */}
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="font-extrabold text-emerald-400 text-xs">
                            {product.price ? product.price.toLocaleString() : '0'}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1">so'm</span>
                        </td>

                        {/* 6. Status */}
                        <td className="py-2.5 px-3 text-center">
                          {hasImg ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Rasmli</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Rasmsiz</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(product);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow transition-all cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Tahrirlash</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ========================================================
             SETKA KO'RINISHI (GRID VIEW)
             ======================================================== */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.slice(0, 150).map((product) => {
              const hasImg = !!(product.image || product.imageUrl);
              return (
                <div
                  key={product.id}
                  onClick={() => setEditingProduct(product)}
                  className={`group relative bg-slate-900/90 hover:bg-slate-800/90 border rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xl ${
                    hasImg
                      ? 'border-slate-800 hover:border-emerald-500/40'
                      : 'border-amber-500/20 hover:border-amber-400/60 bg-amber-500/[0.02]'
                  }`}
                >
                  {/* Thumbnail / Image Preview */}
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner group-hover:border-slate-700">
                    <ProductThumbnail
                      product={product}
                      className="w-full h-full object-contain p-1"
                    />
                    {!hasImg && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex flex-col items-center justify-center text-amber-400 gap-0.5">
                        <Camera className="w-5 h-5" />
                        <span className="text-[9px] font-black">+ Rasm</span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                      {product.nameUz || product.nameRu || 'Nomsiz tovar'}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {product.barcode && (
                        <span className="font-mono text-slate-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {product.barcode}
                        </span>
                      )}
                      {product.brand && (
                        <span className="text-slate-400 truncate">
                          {product.brand}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {product.price ? product.price.toLocaleString() : '0'} so'm
                      </span>

                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 group-hover:text-amber-400">
                        <Edit3 className="w-3 h-3" />
                        <span>Tahrirlash</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BARCODE SCANNER MODAL */}
      {isBarcodeScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scan className="w-4 h-4 text-amber-400" />
                Shtrix-kod Skaneri
              </h3>
              <button
                onClick={stopBarcodeScanner}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square border border-slate-800 flex items-center justify-center">
              {barcodeScanError ? (
                <p className="text-xs text-rose-400 p-4">{barcodeScanError}</p>
              ) : (
                <>
                  <video
                    ref={barcodeVideoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse" />
                  <div className="absolute inset-6 border-2 border-dashed border-amber-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="bg-slate-950/80 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur">
                      Shtrix-kodni qizil chiziqqa to'g'rilang
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={stopBarcodeScanner}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT STUDIO MODAL */}
      {editingProduct && (
        <ProductStudioModal
          product={editingProduct}
          categories={categories}
          allProductsList={products}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
        />
      )}

    </div>
  );
};

