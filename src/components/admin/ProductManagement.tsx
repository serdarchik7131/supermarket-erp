import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { printElementById } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Grid,
  MoreVertical,
  Plus,
  Filter,
  X,
  Edit2,
  Trash2,
  Copy,
  Printer,
  CheckCircle2,
  Barcode,
  Package,
  Upload,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Product, Category, Branch } from '../../types';
import { fetchProducts, fetchCategories, fetchBranches, createProduct, updateProduct, uploadProductImage } from '../../services/api';
import { subscribeAppDataSync } from '../../utils/syncManager';
import { getAutoProductImage, getTotalStock } from '../../utils/productUtils';
import { ProductThumbnail } from '../common/ProductThumbnail';
import { matchProductSearch, filterProductsSmart } from '../../utils/searchUtils';
import { downloadTemplateById } from '../../utils/templateUtils';
import { useLanguage } from '../../context/LanguageContext';
import { RegosImportModal } from './RegosImportModal';
import { StrictImageDiscoveryModal } from './StrictImageDiscoveryModal';

export const ProductManagement: React.FC = () => {
  const { language, t, getProductName, getCategoryName } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Regos Import Modal
  const [isRegosModalOpen, setIsRegosModalOpen] = useState(false);

  // Strict Image Discovery Modal
  const [isImageDiscoveryModalOpen, setIsImageDiscoveryModalOpen] = useState(false);
  const [discoveryTargetProduct, setDiscoveryTargetProduct] = useState<Product | null>(null);

  // Navigation Sub-Tabs
  const [activeTab, setActiveTab] = useState<'sellable' | 'inventory' | 'withdrawn' | 'all' | 'deleted'>('all');

  // Filter & Search States
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [onlyHasBarcode, setOnlyHasBarcode] = useState(false);
  const [minPriceFilter, setMinPriceFilter] = useState<string>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('');

  // Debounce search input by 50ms so typing never stutters
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 50);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // View & Pagination
  const [viewStyle, setViewStyle] = useState<'list' | 'grid'>('list');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Row Action Dropdown
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Barcode Print Modal
  const [barcodePrintProduct, setBarcodePrintProduct] = useState<Product | null>(null);

  // Modal State for Add / Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [nameUz, setNameUz] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionRu, setDescriptionRu] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState(15000);
  const [costPrice, setCostPrice] = useState(10000);
  const [categoryId, setCategoryId] = useState('cat_grocery');
  const [unit, setUnit] = useState<'kg' | 'dona' | 'litr' | 'quti' | 'pachka'>('dona');
  const [brand, setBrand] = useState('Tradeuz');
  const [sizesInput, setSizesInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [stockCount, setStockCount] = useState(100);
  const [image, setImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    loadData();
    const unsub = subscribeAppDataSync(() => {
      loadData();
    });
    return () => {
      unsub();
    };
  }, []);

  const loadData = async () => {
    const [pList, cList, bList] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchBranches(),
    ]);
    setProducts(pList);
    setCategories(cList);
    setBranches(bList);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setNameUz('');
    setNameRu('');
    setNameEn('');
    setDescription('');
    setDescriptionRu('');
    setDescriptionEn('');
    setMinQuantity(1);
    setSku('');
    setBarcode('');
    setPrice(15000);
    setCostPrice(10000);
    setCategoryId(categories[0]?.id || 'cat_grocery');
    setUnit('dona');
    setBrand('Tradeuz');
    setSizesInput('');
    setColorsInput('');
    setStockCount(100);
    setImage(''); // Empty image triggers auto-icon calculation
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setNameUz(p.nameUz || '');
    setNameRu(p.nameRu || p.nameUz || '');
    setNameEn(p.nameEn || p.nameUz || '');
    setDescription(p.description || p.descriptionUz || '');
    setDescriptionRu(p.descriptionRu || p.description || '');
    setDescriptionEn(p.descriptionEn || p.description || '');
    setMinQuantity(p.minQuantity || 1);
    setSku(p.sku);
    setBarcode(p.barcode);
    setPrice(p.price);
    setCostPrice(p.costPrice);
    setCategoryId(p.categoryId);
    setUnit(p.unit as any);
    setBrand(p.brand || 'Tradeuz');
    setSizesInput((p.sizes || []).join(', '));
    setColorsInput((p.colors || []).join(', '));
    setStockCount(getTotalStock(p));
    setImage(p.image || '');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDuplicateProduct = async (p: Product) => {
    const newP = await createProduct({
      ...p,
      id: `prod_dup_${Date.now()}`,
      nameUz: `${p.nameUz} (Kopiya)`,
      nameRu: `${p.nameRu} (Kopiya)`,
      sku: `${p.sku}-DUP`,
      barcode: `${Math.floor(4780000000000 + Math.random() * 90000000000)}`,
    });
    setProducts((prev) => [newP, ...prev]);
    setActiveMenuId(null);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
    setActiveMenuId(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auto image selection if image is empty
    const computedImage = image && image.trim() !== ''
      ? image
      : getAutoProductImage({ nameUz, description, categoryId });

    const parsedSizes = sizesInput
      ? sizesInput.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const parsedColors = colorsInput
      ? colorsInput.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    const newStockByBranch = {
      br_toshkent_main: stockCount,
      br_chilanzar: Math.floor(stockCount * 0.4),
      br_samarkand: Math.floor(stockCount * 0.3),
    };

    if (editingProduct) {
      const updated = await updateProduct(editingProduct.id, {
        nameUz,
        nameRu: nameRu || nameUz,
        nameEn: nameEn || nameUz,
        description: description || '',
        descriptionUz: description || '',
        descriptionRu: descriptionRu || description || '',
        descriptionEn: descriptionEn || description || '',
        minQuantity: minQuantity || 1,
        sku,
        barcode,
        price,
        costPrice,
        categoryId,
        unit,
        brand,
        sizes: parsedSizes,
        colors: parsedColors,
        stockByBranch: newStockByBranch,
        image: computedImage,
      });
      setProducts((prev) => prev.map((item) => (item.id === editingProduct.id ? updated : item)));
    } else {
      const newP = await createProduct({
        nameUz,
        nameRu: nameRu || nameUz,
        nameEn: nameEn || nameUz,
        description: description || '',
        descriptionUz: description || '',
        descriptionRu: descriptionRu || description || '',
        descriptionEn: descriptionEn || description || '',
        minQuantity: minQuantity || 1,
        sku: sku || `${Math.floor(200 + Math.random() * 800)}`,
        barcode: barcode || `${Math.floor(4780000000000 + Math.random() * 90000000000)}`,
        price,
        costPrice,
        categoryId,
        unit,
        brand,
        sizes: parsedSizes,
        colors: parsedColors,
        image: computedImage,
        stockByBranch: newStockByBranch,
      });
      setProducts((prev) => [newP, ...prev]);
    }
    setIsModalOpen(false);
  };

  const exportExcelCSV = () => {
    exportToExcel({
      filename: `tovar_katalogi_${Date.now()}`,
      title: 'TRADEUZ SFA — Tovar Katalogi va Qoldiqlar',
      subtitle: `Filtr bo'yicha jami: ${filteredProducts.length} ta tovar`,
      columns: [
        { header: '№', key: 'index', align: 'center' },
        { header: 'Mahsulot Nomi', key: 'name', align: 'left' },
        { header: 'Shtrixkod', key: 'barcode', align: 'center' },
        { header: 'Kategoriya / SKU', key: 'sku', align: 'center' },
        { header: 'Brend / Ishlab chiqaruvchi', key: 'brand', align: 'left' },
        { header: 'Birlik', key: 'unit', align: 'center' },
        { header: 'Ombor Qoldig\'i', key: 'stock', align: 'center' },
        { header: 'Sotish Narxi (UZS)', key: 'price', align: 'right' },
      ],
      data: filteredProducts.map((p, idx) => ({
        index: idx + 1,
        name: p.nameUz,
        barcode: p.barcode || 'Mavjud emas',
        sku: p.sku || '-',
        brand: p.brand || 'Tradeuz',
        unit: p.unit || 'dona',
        stock: p.stockQuantity || 0,
        price: p.price.toLocaleString('uz-UZ'),
      })),
      summary: {
        name: 'JAMI MAHSULOTLAR:',
        stock: filteredProducts.reduce((sum, p) => sum + (p.stockQuantity || 0), 0) + ' dona',
      },
    });
  };

  // Deferred search query to keep typing 60 FPS smooth without main-thread blocking
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Highly Optimized Filter & Smart Relevance Ranking Engine
  const filteredProducts = useMemo(() => {
    return filterProductsSmart(
      products,
      deferredSearchQuery,
      selectedCategory,
      categories,
      (p) => {
        // 1. Tab Filter
        if (activeTab === 'sellable') {
          const stockValues = p.stockByBranch ? (Object.values(p.stockByBranch) as number[]) : [];
          const totalStock = stockValues.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
          if (totalStock <= 0) return false;
        }
        if (activeTab === 'withdrawn') {
          const stockValues = p.stockByBranch ? (Object.values(p.stockByBranch) as number[]) : [];
          const totalStock = stockValues.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
          if (totalStock > 0) return false;
        }

        // 2. Brand Filter
        if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;

        // 3. Barcode Filter
        if (onlyHasBarcode && (!p.barcode || p.barcode === 'None' || p.barcode.length < 4)) return false;

        // 4. Price Range Filter
        const minP = minPriceFilter ? Number(minPriceFilter) : 0;
        const maxP = maxPriceFilter ? Number(maxPriceFilter) : Infinity;
        if (p.price < minP || p.price > maxP) return false;

        return true;
      }
    );
  }, [
    products,
    deferredSearchQuery,
    selectedCategory,
    categories,
    activeTab,
    selectedBrand,
    onlyHasBarcode,
    minPriceFilter,
    maxPriceFilter,
  ]);

  // Pagination Math
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setOnlyHasBarcode(false);
    setMinPriceFilter('');
    setMaxPriceFilter('');
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs text-slate-800 font-sans">
      {/* Hidden button for trigger from layout top bar */}
      <button id="tradeuz-add-product-trigger" className="hidden" onClick={handleOpenAddModal}></button>

      {/* 1. SUB-TABS UNDERLINE BAR (Exact Tradeuz style) */}
      <div className="border-b border-slate-200 bg-white px-4 flex items-center gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'sellable', label: 'Можно продавать' },
          { id: 'inventory', label: 'Инвентари' },
          { id: 'withdrawn', label: 'Сняты с продажи' },
          { id: 'all', label: 'Все' },
          { id: 'deleted', label: 'Удалённые' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setCurrentPage(1);
            }}
            className={`py-3 text-xs font-medium transition-all relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>}
          </button>
        ))}
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className="p-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-600">
        {/* Left Filter Toggle */}
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-1 font-medium text-xs py-1 px-2.5 rounded transition-colors ${
            showFilter ? 'bg-blue-600 text-white font-bold' : 'text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>{showFilter ? 'Скрыть фильтр' : 'Показать фильтр'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
        </button>

        {/* Center Search Input Box */}
        <div className="relative flex-1 max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Поиск по наименованию, штрих-коду, артикулу..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs pl-3 pr-8 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {searchInput ? (
            <button
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 cursor-pointer" />
          )}
        </div>

        {/* Right Pagination & Layout Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              setDiscoveryTargetProduct(null);
              setIsImageDiscoveryModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-1 px-3 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Qat'iy internetdan rasm qidirish va verifikatsiya qilish tizimi"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
            <span>AI Rasm Verifikatsiyasi</span>
          </button>

          <button
            onClick={() => setIsRegosModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-1 px-3 rounded-lg shadow-sm transition-all cursor-pointer"
            title="REGOS Online (regos.online) dan tovarlar va narxlarni import qilish"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>REGOS dan Import</span>
          </button>

          <button
            onClick={() => downloadTemplateById('products')}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold py-1 px-2.5 rounded transition-all"
            title="Mahsulotlar import shablonini yuklab olish (.csv)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Import Shablon (.CSV)</span>
          </button>

          {/* Page Size Dropdown */}
          <div className="flex items-center gap-1">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {/* Pagination Counts */}
          <span className="text-slate-500 text-[11px] font-mono">
            {filteredProducts.length > 0 ? `${startIndex + 1} - ${Math.min(startIndex + pageSize, filteredProducts.length)}` : '0'}{' '}
            из {filteredProducts.length}
          </span>

          {/* Pagination Arrows */}
          <div className="flex items-center gap-0.5 text-slate-600">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 disabled:opacity-30 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-1 font-bold text-[11px]">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 disabled:opacity-30 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              onClick={() => setViewStyle('list')}
              className={`p-1 rounded transition-colors ${
                viewStyle === 'list' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Ro'yxat ko'rinishi"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewStyle('grid')}
              className={`p-1 rounded transition-colors ${
                viewStyle === 'grid' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Kataklar (Grid) ko'rinishi"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Export Icon */}
          <button
            onClick={exportExcelCSV}
            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Excel/CSV Yuklab olish"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EXPANDABLE ADVANCED FILTER PANEL */}
      {showFilter && (
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-fadeIn">
          <div>
            <label className="text-slate-600 block mb-1 font-semibold">Kategoriya:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-slate-300 p-1.5 rounded-md text-slate-800"
            >
              <option value="all">Barcha kategoriyalar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameUz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">Brend / Tashkilot:</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-white border border-slate-300 p-1.5 rounded-md text-slate-800"
            >
              <option value="all">Barcha brendlar</option>
              <option value="Био Лайф">Био Лайф</option>
              <option value="Аристократ">Аристократ</option>
              <option value="Мохито">Мохито</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">Narx diapazoni (UZS):</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Min"
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 p-1.5 rounded-md text-slate-800"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 p-1.5 rounded-md text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={onlyHasBarcode}
                onChange={(e) => setOnlyHasBarcode(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Faqat shtrix-kodli</span>
            </label>

            <button
              onClick={resetFilters}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md font-semibold text-xs"
            >
              Shtirish
            </button>
          </div>
        </div>
      )}

      {/* 3. DISPLAY VIEW (LIST vs GRID) */}
      {viewStyle === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#24275f] text-white font-semibold border-b border-indigo-900">
                <th className="p-1.5 font-semibold border-r border-indigo-900">Наименование</th>
                <th className="p-1.5 font-semibold border-r border-indigo-900">Штрих - код товара</th>
                <th className="p-1.5 font-semibold border-r border-indigo-900">Артикул</th>
                <th className="p-1.5 font-semibold border-r border-indigo-900">Тип товара</th>
                <th className="p-1.5 font-semibold border-r border-indigo-900">Организация</th>
                <th className="p-1.5 font-semibold border-r border-indigo-900 text-right">Цена продажи</th>
                <th className="p-1.5 font-semibold border-r border-indigo-900">Мера</th>
                <th className="p-1.5 font-semibold border-r border-indigo-900">Дата создания</th>
                <th className="p-1.5 w-12 text-center font-semibold">Амлият</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {paginatedProducts.map((p, idx) => {
                const isBarcodeSet = p.barcode && p.barcode !== 'None' && p.barcode.length > 5;
                const isMenuOpen = activeMenuId === p.id;

                return (
                  <tr key={`${p.id}_${idx}`} className="hover:bg-blue-50/70 transition-colors even:bg-slate-50/50">
                    {/* Product Name with Thumbnail */}
                    <td className="p-1.5 border-r border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded shrink-0 bg-slate-50 border border-slate-200 p-0.5 overflow-hidden flex items-center justify-center relative group cursor-pointer"
                          onClick={() => {
                            setDiscoveryTargetProduct(p);
                            setIsImageDiscoveryModalOpen(true);
                          }}
                          title="Rasmni tekshirish uchun bosing"
                        >
                          <ProductThumbnail product={p} iconSize="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-[11px] block">{getProductName(p)}</span>
                          {p.description && (
                            <span className="text-[9px] text-slate-500 line-clamp-1">{p.description}</span>
                          )}
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {p.sizes && p.sizes.length > 0 && (
                              <span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.2 rounded border border-purple-200 font-medium">
                                Razmer: {p.sizes.join(', ')}
                              </span>
                            )}
                            {p.colors && p.colors.length > 0 && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-200 font-medium">
                                Rang: {p.colors.join(', ')}
                              </span>
                            )}
                            {getTotalStock(p) <= 0 ? (
                              <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-1 rounded">
                                🚫 Tugagan
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-medium px-1 rounded">
                                Ombor: {getTotalStock(p)} {p.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="p-1.5 border-r border-slate-200 text-[10px]">
                      {isBarcodeSet ? (
                        <span className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                          {p.barcode}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">
                          {p.barcode === 'None' ? 'None' : 'не установлен'}
                        </span>
                      )}
                    </td>

                    {/* SKU / Article */}
                    <td className="p-1.5 border-r border-slate-200 font-mono text-[10px] text-slate-700">
                      {p.sku || '-'}
                    </td>

                    {/* Product Type */}
                    <td className="p-1.5 border-r border-slate-200 text-slate-700 font-medium">
                      {p.nameUz.split(' ')[0]} {p.nameUz.split(' ')[1] || ''}
                    </td>

                    {/* Organization */}
                    <td className="p-1.5 border-r border-slate-200 text-slate-700 font-medium">
                      {p.brand || 'Био Лайф'}
                    </td>

                    {/* Price */}
                    <td className="p-1.5 border-r border-slate-200 font-extrabold font-mono text-slate-900 text-right whitespace-nowrap">
                      {p.price.toLocaleString('ru-RU')} SUM
                    </td>

                    {/* Packaging / Measure */}
                    <td className="p-1.5 border-r border-slate-200 text-slate-700 font-medium">
                      блок
                    </td>

                    {/* Date */}
                    <td className="p-1.5 border-r border-slate-200 text-slate-600 text-[10px]">
                      07 авг. 2026
                    </td>

                    {/* Action 3 Dots Dropdown */}
                    <td className="py-2 px-2 text-center relative">
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Amallar"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-2 top-8 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 py-1.5 w-44 text-left font-sans text-xs space-y-0.5">
                          <button
                            onClick={() => {
                              setDiscoveryTargetProduct(p);
                              setIsImageDiscoveryModalOpen(true);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2 text-blue-700 font-medium"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Rasm Verifikatsiyasi</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="w-full px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 text-slate-800 font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Tahrirlash</span>
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(p)}
                            className="w-full px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 text-slate-800 font-medium"
                          >
                            <Copy className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Nusxalash</span>
                          </button>
                          <button
                            onClick={() => {
                              setBarcodePrintProduct(p);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 text-slate-800 font-medium"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Shtrix-kod Bosish</span>
                          </button>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="w-full px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>O'chirish</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50">
          {paginatedProducts.map((p, idx) => {
            const stock = getTotalStock(p);
            const isOutOfStock = stock <= 0;

            return (
              <div
                key={`${p.id}_${idx}`}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative"
              >
                <div className="space-y-2">
                  <div className="h-32 bg-slate-50 rounded-xl p-2 flex items-center justify-center border border-slate-100 relative">
                    <ProductThumbnail product={p} iconSize="w-10 h-10" imgClassName="h-full w-full object-contain" />
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {p.brand || 'Tradeuz'}
                    </span>
                    {isOutOfStock && (
                      <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Tugagan
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-xs line-clamp-2">{p.nameUz}</h3>
                  {p.description && (
                    <p className="text-[10px] text-slate-500 line-clamp-2">{p.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {p.sizes && p.sizes.length > 0 && (
                      <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                        Razmer: {p.sizes.join(', ')}
                      </span>
                    )}
                    {p.colors && p.colors.length > 0 && (
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">
                        Rang: {p.colors.join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span>SKU: {p.sku || '-'}</span>
                    <span className={isOutOfStock ? 'text-rose-600 font-bold' : 'text-emerald-700 font-medium'}>
                      {isOutOfStock ? 'Omborda 0' : `Ombor: ${stock} ${p.unit}`}
                    </span>
                  </div>
                </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Sotish narxi:</div>
                  <div className="font-extrabold text-slate-900 text-sm font-mono">{p.price.toLocaleString()} UZS</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {editingProduct ? 'Товарни таҳрирлаш' : 'Янги товар қўшиш'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-extrabold text-slate-700 block border-b border-slate-200 pb-1">
                  🌐 Mahsulot Nomi va Ma'lumotlari (Uch Tilda):
                </span>
                
                <div>
                  <label className="text-slate-700 block mb-0.5 font-bold">🇺🇿 Mahsulot Nomi (O'zbekcha) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Sut 3.2% 1 litr"
                    value={nameUz}
                    onChange={(e) => {
                      setNameUz(e.target.value);
                      if (!nameRu) setNameRu(e.target.value);
                      if (!nameEn) setNameEn(e.target.value);
                    }}
                    className="w-full bg-white text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-700 block mb-0.5 font-bold">🇷🇺 Имя (На русском)</label>
                    <input
                      type="text"
                      placeholder="Молоко 3.2% 1л"
                      value={nameRu}
                      onChange={(e) => setNameRu(e.target.value)}
                      className="w-full bg-white text-slate-900 p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-0.5 font-bold">🇬🇧 Name (In English)</label>
                    <input
                      type="text"
                      placeholder="Milk 3.2% 1L"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      className="w-full bg-white text-slate-900 p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 block mb-0.5 font-bold">🇺🇿 Tavsif / Ma'lumot (O'zbekcha)</label>
                  <textarea
                    rows={2}
                    placeholder="Mahsulot haqida qisqacha..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-700 block mb-0.5 font-bold">🇷🇺 Описание (Русский)</label>
                    <textarea
                      rows={1}
                      placeholder="Краткое описание..."
                      value={descriptionRu}
                      onChange={(e) => setDescriptionRu(e.target.value)}
                      className="w-full bg-white text-slate-900 p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-0.5 font-bold">🇬🇧 Description (English)</label>
                    <textarea
                      rows={1}
                      placeholder="Short description..."
                      value={descriptionEn}
                      onChange={(e) => setDescriptionEn(e.target.value)}
                      className="w-full bg-white text-slate-900 p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Minimal buyurtma miqdori ({unit}):</label>
                  <input
                    type="number"
                    step={unit === 'dona' || unit === 'quti' || unit === 'pachka' ? '1' : '0.1'}
                    min={unit === 'dona' || unit === 'quti' || unit === 'pachka' ? 1 : 0.1}
                    value={minQuantity}
                    onChange={(e) => {
                      const isPiece = unit === 'dona' || unit === 'quti' || unit === 'pachka';
                      const minAllowed = isPiece ? 1 : 0.1;
                      const val = parseFloat(e.target.value);
                      setMinQuantity(isNaN(val) ? minAllowed : Math.max(minAllowed, val));
                    }}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Mijoz bir safarda eng kamida shuncha olishi shart ({unit === 'dona' ? '1 dona' : '0.1 yoki 100gr'})</span>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">O'lchov birligi (Unit):</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    <option value="dona">dona</option>
                    <option value="kg">kg</option>
                    <option value="litr">litr</option>
                    <option value="quti">quti</option>
                    <option value="pachka">pachka</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Kategoriya:</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameUz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Ombor qoldig'i (Dona):</label>
                  <input
                    type="number"
                    min={0}
                    value={stockCount}
                    onChange={(e) => setStockCount(Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Sizes and Colors inputs (For apparel, stationery, etc.) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Razmerlar (vergul bilan):</label>
                  <input
                    type="text"
                    placeholder="S, M, L, XL yoki 38, 39, 40"
                    value={sizesInput}
                    onChange={(e) => setSizesInput(e.target.value)}
                    className="w-full bg-white text-slate-900 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">Kiyim/poyabzal uchun</span>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Ranglar (vergul bilan):</label>
                  <input
                    type="text"
                    placeholder="Qora, Oq, Qizil, Ko'k"
                    value={colorsInput}
                    onChange={(e) => setColorsInput(e.target.value)}
                    className="w-full bg-white text-slate-900 p-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">Kans/kiyim ranglari</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Артикул (SKU):</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Штрих-код:</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Сотиш нархи (UZS):</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Бренд / Ташкилот:</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Mahsulot rasmi (Ixtiyoriy):</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1 text-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingImage ? 'Rasm yuklanmoqda...' : 'Galereyadan rasm yuklash'}</span>
                      <input
                        type="file"
                        accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif"
                        className="hidden"
                        disabled={isUploadingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploadingImage(true);
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              if (typeof reader.result === 'string') {
                                try {
                                  const res = await uploadProductImage(reader.result, file.name);
                                  if (res && res.imageUrl) {
                                    setImage(res.imageUrl);
                                  } else {
                                    setImage(reader.result);
                                  }
                                } catch (err) {
                                  setImage(reader.result);
                                } finally {
                                  setIsUploadingImage(false);
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="Yoki rasm URL manzilini kiriting..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-[11px]"
                  />

                  {/* Auto-Icon or Uploaded Image Preview */}
                  <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 shrink-0 bg-white border border-slate-300 p-0.5 rounded overflow-hidden flex items-center justify-center">
                      <ProductThumbnail product={{ image, imageUrl: image, nameUz, description, categoryId, brand }} iconSize="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-[10px]">
                      {image && image.trim() !== '' ? (
                        <span className="text-emerald-700 font-bold block">✓ Qo'lda biriktirilgan rasm</span>
                      ) : (
                        <span className="text-blue-700 font-bold block">✨ Avto-Rasm: Mahsulot turi va brendiga mos rasm biriktirilgan</span>
                      )}
                    </div>
                    {image && (
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="text-rose-600 text-[10px] font-bold hover:underline"
                      >
                        Tozalash
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Бекор қилиш
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-xs transition-colors"
                >
                  Сақлаш
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINT BARCODE */}
      {barcodePrintProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Штрих-код Босиб Чиқариш</span>
              </h3>
              <button onClick={() => setBarcodePrintProduct(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-barcode" className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 space-y-2">
              <div className="font-bold text-slate-900 text-xs">{barcodePrintProduct.nameUz}</div>
              <div className="font-mono text-lg tracking-widest font-black text-slate-900">
                |||| ||| ||||||| ||||
              </div>
              <div className="font-mono text-xs font-semibold text-slate-700">{barcodePrintProduct.barcode}</div>
              <div className="font-bold text-blue-600 text-xs">{barcodePrintProduct.price.toLocaleString()} UZS</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBarcodePrintProduct(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-lg"
              >
                Yopish
              </button>
              <button
                onClick={() => {
                  printElementById('printable-barcode', `Barcode_${barcodePrintProduct.barcode}`);
                  setBarcodePrintProduct(null);
                }}
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Chop Etish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Image Discovery & Verification Modal */}
      <StrictImageDiscoveryModal
        isOpen={isImageDiscoveryModalOpen}
        onClose={() => {
          setIsImageDiscoveryModalOpen(false);
          setDiscoveryTargetProduct(null);
        }}
        products={products}
        categories={categories}
        initialProduct={discoveryTargetProduct}
        onProductUpdated={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />

      {/* Regos Online Import Modal */}
      <RegosImportModal
        isOpen={isRegosModalOpen}
        onClose={() => setIsRegosModalOpen(false)}
        categories={categories}
        existingProducts={products}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};
