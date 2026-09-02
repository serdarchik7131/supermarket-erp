import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Percent,
  CheckCircle2,
  DollarSign,
  Layers,
  Search,
  Filter,
  Save,
  RefreshCw,
  HelpCircle,
  Eye,
  Lock as LockIcon,
  Sparkles,
  Bot,
  Zap,
  BellRing,
  Check,
  X,
  History,
  ArrowRight,
  ShieldCheck,
  Package,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Product, Category, PriceType, ProductTypeGroup, PendingProduct, PriceChangeLog } from '../../types';
import { getAutoProductImage } from '../../utils/productUtils';
import { ProductThumbnail } from '../common/ProductThumbnail';
import { RegosImportModal } from './RegosImportModal';
import {
  fetchProducts,
  fetchCategories,
  fetchPriceTypes,
  createPriceType,
  updatePriceType,
  applyPriceMarkup,
  updateProductPrices,
  fetchPriceGroups,
  updatePriceGroup,
  fetchPendingProducts,
  approvePendingProduct,
  rejectPendingProduct,
  fetchPriceChangeLogs,
  triggerDualBotSync,
} from '../../services/api';
import { matchProductSearch } from '../../utils/searchUtils';

export const PricesModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'types' | 'pending' | 'logs'>('types');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [priceGroups, setPriceGroups] = useState<ProductTypeGroup[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [priceLogs, setPriceLogs] = useState<PriceChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegosModalOpen, setIsRegosModalOpen] = useState(false);
  const [isSyncingBot, setIsSyncingBot] = useState(false);

  // Filters for matrix
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filters for type groups
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, pageSize]);

  // Local state for product price edits
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number>>>({});

  // Local state for type group price edits
  const [groupPriceEdits, setGroupPriceEdits] = useState<Record<string, { price: number; costPrice: number }>>({});
  const [updatingGroupKey, setUpdatingGroupKey] = useState<string | null>(null);

  // Auto-Markup Generator State
  const [targetPriceCode, setTargetPriceCode] = useState<string>('optom');
  const [targetCategory, setTargetCategory] = useState<string>('all');
  const [markupPercentInput, setMarkupPercentInput] = useState<number>(15);
  const [isApplyingMarkup, setIsApplyingMarkup] = useState(false);

  // Modal State for New Price Type
  const [isAddPriceTypeOpen, setIsAddPriceTypeOpen] = useState(false);
  const [newPtName, setNewPtName] = useState('');
  const [newPtCode, setNewPtCode] = useState('');
  const [newPtMarkup, setNewPtMarkup] = useState<number>(20);
  const [newPtIsClientDefault, setNewPtIsClientDefault] = useState(false);
  const [newPtDesc, setNewPtDesc] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, pts, grps, pends, logs] = await Promise.all([
        fetchProducts().catch(() => []),
        fetchCategories().catch(() => []),
        fetchPriceTypes().catch(() => []),
        fetchPriceGroups().catch(() => []),
        fetchPendingProducts().catch(() => []),
        fetchPriceChangeLogs().catch(() => []),
      ]);

      setProducts(prods);
      setCategories(cats);
      setPriceTypes(pts);
      setPriceGroups(grps);
      setPendingProducts(pends);
      setPriceLogs(logs);

      // Initialize local edits map
      const editsMap: Record<string, Record<string, number>> = {};
      prods.forEach((p) => {
        editsMap[p.id] = {
          prixod: p.costPrice || 0,
          roznitsa: p.prices?.roznitsa || p.price || Math.round((p.costPrice || 10000) * 1.3),
          optom: p.prices?.optom || Math.round((p.costPrice || 10000) * 1.15),
          vip: p.prices?.vip || Math.round((p.costPrice || 10000) * 1.1),
          ...(p.prices || {}),
        };
      });
      setEditedPrices(editsMap);

      // Initialize group edits
      const grpEdits: Record<string, { price: number; costPrice: number }> = {};
      grps.forEach((g: ProductTypeGroup) => {
        grpEdits[g.typeKey] = {
          price: g.currentPrice || 0,
          costPrice: g.costPrice || Math.round((g.currentPrice || 0) * 0.78),
        };
      });
      setGroupPriceEdits(grpEdits);
    } catch (err) {
      console.error('Error loading prices data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Handle price input change locally
  const handlePriceChange = (productId: string, priceCode: string, value: number) => {
    setEditedPrices((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [priceCode]: value,
      },
    }));
  };

  // Save prices for a single product
  const handleSaveProductPrices = async (productId: string) => {
    const pricesMap = editedPrices[productId];
    if (!pricesMap) return;

    try {
      await updateProductPrices(productId, pricesMap);
      showToast('✅ Mahsulot narxlari muvaffaqiyatli saqlandi!');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Xatolik yuz berdi!');
    }
  };

  // Save all changed prices in batch
  const handleSaveAllPrices = async () => {
    try {
      const promises = Object.entries(editedPrices).map(([pId, pMap]) =>
        updateProductPrices(pId, pMap as Record<string, number>)
      );
      await Promise.all(promises);
      showToast('✅ Barcha mahsulotlar narxlari saqlandi!');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Massiv saqlashda xatolik!');
    }
  };

  // Save/Propagate Price for entire Type/Family Group
  const handleUpdateGroupPrice = async (typeKey: string) => {
    const edit = groupPriceEdits[typeKey];
    if (!edit || edit.price <= 0) {
      showToast("❌ Narx 0 dan katta bo'lishi kerak!");
      return;
    }

    setUpdatingGroupKey(typeKey);
    try {
      const res = await updatePriceGroup(typeKey, edit.price, edit.costPrice, true);
      showToast(res.message || `✅ "${typeKey}" tipi bo'yicha barcha assortimentlar narxi yangilandi!`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Tip narxini yangilashda xatolik!');
    } finally {
      setUpdatingGroupKey(null);
    }
  };

  // Trigger Source Bot Sync Now
  const handleTriggerSyncNow = async () => {
    setIsSyncingBot(true);
    try {
      const res = await triggerDualBotSync();
      showToast(res.message || "✅ Ko'chirma botidan sinxronlash bajarildi!");
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Sinxronlashda xatolik!');
    } finally {
      setIsSyncingBot(false);
    }
  };

  // Approve Pending Product (adds to store catalog + notifies admin)
  const handleApprovePending = async (id: string, name: string) => {
    try {
      const res = await approvePendingProduct(id);
      showToast(res.message || `✅ "${name}" do'kon katalogiga kiritildi!`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Tasdiqlashda xatolik!');
    }
  };

  // Reject Pending Product
  const handleRejectPending = async (id: string, name: string) => {
    try {
      await rejectPendingProduct(id);
      showToast(`⚠️ "${name}" rad etildi.`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Rad etishda xatolik!');
    }
  };

  // Execute Auto-Markup Calculation (+Foiz qo'shish)
  const handleApplyMarkup = async () => {
    if (!targetPriceCode || markupPercentInput < 0) return;
    setIsApplyingMarkup(true);
    try {
      const res = await applyPriceMarkup(targetPriceCode, markupPercentInput, targetCategory);
      showToast(`✅ ${res.updatedCount} ta mahsulotga +${markupPercentInput}% foiz narx biriktirildi!`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Foiz hisoblashda xatolik!');
    } finally {
      setIsApplyingMarkup(false);
    }
  };

  // Create new Price Type
  const handleCreatePriceType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtName.trim()) return;

    const code = newPtCode.trim() || `price_${Date.now()}`;
    try {
      await createPriceType({
        nameUz: newPtName,
        code: code.toLowerCase().replace(/\s+/g, '_'),
        defaultMarkupPercent: newPtMarkup,
        isDefaultClientPrice: newPtIsClientDefault,
        description: newPtDesc,
      });
      showToast(`Yangi narx turi yaratildi: ${newPtName}`);
      setIsAddPriceTypeOpen(false);
      setNewPtName('');
      setNewPtCode('');
      setNewPtDesc('');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('❌ Narx turini yaratishda xatolik!');
    }
  };

  // Filter products list
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const catName = categories.find((c) => c.id === p.categoryId)?.nameUz || '';
      const matchesQuery = matchProductSearch(p, searchQuery, catName);
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery, categories]);

  // Filter price groups
  const filteredPriceGroups = React.useMemo(() => {
    if (!groupSearchQuery.trim()) return priceGroups;
    const q = groupSearchQuery.toLowerCase().trim();
    return priceGroups.filter(
      (g) =>
        g.typeKey.toLowerCase().includes(q) ||
        g.brand.toLowerCase().includes(q) ||
        g.sampleAssortments.some((s) => s.toLowerCase().includes(q))
    );
  }, [priceGroups, groupSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  return (
    <div className="space-y-5 p-4 sm:p-6 bg-slate-100/60 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Narxlar va Narxlash Bo'limi (Multi-Price & Tip Sinxronizatsiyasi)
              </h1>
              <p className="text-xs text-slate-500">
                Tip bo'yicha (masalan Dena 1L) barcha ta'm va assortimentlar narxini bir vaqtda yangilash, ko'chirma bot sinxronizatsiyasi va yangi mahsulotlar nazorati.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTriggerSyncNow}
            disabled={isSyncingBot}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Ko'chirma botidan narxlarni tekshirish va yangi tovarlarni aniqlash"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingBot ? 'animate-spin' : ''}`} />
            <span>{isSyncingBot ? 'Sinxronlanmoqda...' : "Ko'chirma Botdan Sinxronlash"}</span>
          </button>

          <button
            onClick={() => setIsRegosModalOpen(true)}
            className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REGOS POS</span>
          </button>

          <button
            onClick={() => setIsAddPriceTypeOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Narx Turi</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'types'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>⚡ Tip & Assortiment Narxlarini Bog'lash ({priceGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Barcha Mahsulotlar Matritsasi ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BellRing className="w-4 h-4 text-amber-500" />
          <span>🔔 Yangi Mahsulotlar (Kutilmoqda)</span>
          {pendingProducts.length > 0 && (
            <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
              {pendingProducts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>📋 Narxlar O'zgarish Jurnali ({priceLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: TYPE & ASSORTMENT FAMILY PRICE LINKAGE */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-amber-50 via-indigo-50 to-emerald-50 border border-amber-200/70 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-md shadow-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                💡 Tip Narxini Bog'lash Qoidasi (Avtomatik Assortiment Sinxronizatsiyasi)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ushbu bo'limda bir tovar tipining (masalan <b>"DENA 1L"</b>, <b>"COCA-COLA 1.5L"</b>, <b>"LAYS 225g"</b>, <b>"BONDI 500g"</b>) sotuv narxini o'zgartirsangiz yoki ko'chirma botida narx o'zgarsa — ushbu tipga tegishli <b>BARCHA ta'm va assortimentlarning sotuv narxlari avtomatik tarzda bir zumda yangilanadi</b> va Admin Telegram botiga xabarnoma yuboriladi!
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                placeholder="Tip nomi, brend yoki assortiment qidirish..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Mavjud tovar tiplari: <span className="text-indigo-700 font-extrabold">{filteredPriceGroups.length} ta guruh</span>
            </div>
          </div>

          {/* Grid of Product Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPriceGroups.map((grp) => {
              const edit = groupPriceEdits[grp.typeKey] || { price: grp.currentPrice, costPrice: grp.costPrice || Math.round(grp.currentPrice * 0.78) };
              const marginPercent = edit.costPrice > 0 ? Math.round(((edit.price - edit.costPrice) / edit.costPrice) * 100) : 0;
              const isUpdating = updatingGroupKey === grp.typeKey;

              return (
                <div
                  key={grp.typeKey}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-4 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                          {grp.brand}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 mt-1">{grp.typeKey}</h3>
                      </div>
                      <span className="text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg">
                        {grp.assortmentsCount} ta assortiment
                      </span>
                    </div>

                    {/* Sample flavors */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Biriktirilgan mahsulotlar:
                      </div>
                      <div className="space-y-0.5">
                        {grp.sampleAssortments.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="text-[11px] text-slate-700 font-semibold truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                            <span className="truncate">{item}</span>
                          </div>
                        ))}
                        {grp.assortmentsCount > 3 && (
                          <div className="text-[10px] text-slate-400 font-bold italic">
                            + yana {grp.assortmentsCount - 3} ta assortiment
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price inputs & Update action */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Tannarx (Kirim):
                        </label>
                        <input
                          type="number"
                          value={edit.costPrice}
                          onChange={(e) =>
                            setGroupPriceEdits((prev) => ({
                              ...prev,
                              [grp.typeKey]: {
                                ...(prev[grp.typeKey] || edit),
                                costPrice: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-indigo-900 mb-0.5">
                          Sotuv Narxi (Roznitsa):
                        </label>
                        <input
                          type="number"
                          value={edit.price}
                          onChange={(e) =>
                            setGroupPriceEdits((prev) => ({
                              ...prev,
                              [grp.typeKey]: {
                                ...(prev[grp.typeKey] || edit),
                                price: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full bg-indigo-50 border border-indigo-300 rounded-lg px-2 py-1 text-xs font-mono font-extrabold text-indigo-950 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold text-emerald-600">
                        {marginPercent >= 0 ? `+${marginPercent}%` : `${marginPercent}%`} ustama
                      </span>

                      <button
                        onClick={() => handleUpdateGroupPrice(grp.typeKey)}
                        disabled={isUpdating}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        <span>Barchasiga Tatbiq Etish</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING NEW PRODUCTS (NEVER AUTO-ADDED, ADMIN APPROVES) */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Header Warning */}
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wide">
                🛡️ Yangi Mahsulotlar Xavfsizlik Qoidasi
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                Ko'chirma / Ta'minotchi botidan yangi tovar aniqlanganda, u <b>do'kon katalogiga avtomatik kiritilmaydi</b>. U faqat Admin Telegram botiga bildirishnoma yuboradi va ushbu kutilayotgan ro'yxatga tushadi. Siz uni ko'rib chiqib, <b>"Tasdiqlash va Qo'shish"</b> yoki <b>"Rad etish"</b> mumkin.
              </p>
            </div>
          </div>

          {pendingProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Kutilayotgan yangi mahsulotlar yo'q
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ko'chirma botidan kelgan barcha mahsulotlar katalog bilan to'liq mos yoki allaqachon tasdiqlangan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingProducts.map((pend) => (
                <div
                  key={pend.id}
                  className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                        {pend.brand || 'Yangi Brend'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(pend.detectedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900">{pend.nameUz}</h4>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">Taklif Narxi:</div>
                        <div className="font-extrabold text-slate-900">
                          {pend.suggestedPrice.toLocaleString()} UZS
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">Tannarx:</div>
                        <div className="font-bold text-slate-600">
                          {(pend.costPrice || 0).toLocaleString()} UZS
                        </div>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200 text-[10px] text-slate-500 font-medium">
                        Manba: <b>{pend.source}</b>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleRejectPending(pend.id, pend.nameUz)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Rad Etish</span>
                    </button>

                    <button
                      onClick={() => handleApprovePending(pend.id, pend.nameUz)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tasdiqlash va Qo'shish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRICE CHANGE HISTORY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Avtomatik va Qo'lda O'zgartirilgan Narxlar Jurnali
              </h3>
              <p className="text-xs text-slate-500">
                Tip bo'yicha assortimentlarga tatbiq etilgan barcha narx yangilanishlari tarixi.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">Jami: {priceLogs.length} ta yozuv</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Vaqt</th>
                  <th className="py-2.5 px-3">Tovar Tipi / Brend</th>
                  <th className="py-2.5 px-3 text-right">Eski Narx</th>
                  <th className="py-2.5 px-3 text-right">Yangi Narx</th>
                  <th className="py-2.5 px-3 text-center">Assortimentlar Soni</th>
                  <th className="py-2.5 px-3">Manba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-black text-slate-900">
                      {log.typeKey}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({log.brand})</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-semibold">
                      {log.oldPrice.toLocaleString()} UZS
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">
                      {log.newPrice.toLocaleString()} UZS
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                        {log.affectedCount} ta tovar
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">{log.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COMPLETE PRODUCT MATRIX TABLE */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Auto-Markup Generator Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Percent className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-xs">
                Tezkor Ustama Generator (+Foiz Qo'shish)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Qaysi Narx Turiga:
                </label>
                <select
                  value={targetPriceCode}
                  onChange={(e) => setTargetPriceCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {priceTypes
                    .filter((pt) => pt.code !== 'prixod')
                    .map((pt) => (
                      <option key={pt.id} value={pt.code}>
                        {pt.nameUz} ({pt.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Qaysi Kategoriya:
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Barcha Kategoriyalar</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameUz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ustama Foizi (%):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={markupPercentInput}
                    onChange={(e) => setMarkupPercentInput(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                    placeholder="15"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <button
                onClick={handleApplyMarkup}
                disabled={isApplyingMarkup}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isApplyingMarkup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Foizni Hisoblash va Biriktirish</span>
              </button>
            </div>
          </div>

          {/* Main Pricing Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Filters bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Mahsulot nomi yoki barcode..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Barcha kategoriyalar ({products.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameUz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAllPrices}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Barchasini Saqlash</span>
                </button>
                <div className="text-xs font-bold text-slate-500">
                  Jami: <span className="text-slate-900 font-extrabold">{filteredProducts.length}</span> ta mahsulot
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Mahsulot / SKU</th>
                    <th className="py-3 px-4 text-right bg-slate-200/50 text-slate-900 font-black">
                      Prixod (Kirim)
                    </th>
                    {priceTypes
                      .filter((pt) => pt.code !== 'prixod')
                      .map((pt) => (
                        <th
                          key={pt.id}
                          className={`py-3 px-4 text-center ${
                            pt.isDefaultClientPrice ? 'bg-indigo-50/80 text-indigo-950 font-black' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{pt.nameUz}</span>
                            {pt.isDefaultClientPrice && (
                              <span className="text-[9px] text-indigo-600 font-bold lowercase">
                                (klient koradigan)
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    <th className="py-3 px-4 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProducts.map((p) => {
                    const pEdits = editedPrices[p.id] || {};
                    const costP = pEdits.prixod ?? p.costPrice ?? 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product Name & SKU */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center bg-slate-50">
                              <ProductThumbnail product={p} iconSize="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-xs">{p.nameUz}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {p.sku} | {p.brand} | {p.unit}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Prixod / Cost Price */}
                        <td className="py-3 px-4 bg-slate-50/80 text-right">
                          <input
                            type="number"
                            value={costP}
                            onChange={(e) => handlePriceChange(p.id, 'prixod', Number(e.target.value))}
                            className="w-24 text-right bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                          <div className="text-[9px] text-slate-400 mt-0.5">UZS (Tannarx)</div>
                        </td>

                        {/* Dynamic Price Type Inputs */}
                        {priceTypes
                          .filter((pt) => pt.code !== 'prixod')
                          .map((pt) => {
                            const val = pEdits[pt.code] ?? (p.prices?.[pt.code] || p.price);
                            const marginPercent = costP > 0 ? Math.round(((val - costP) / costP) * 100) : 0;

                            return (
                              <td
                                key={pt.id}
                                className={`py-3 px-4 text-center ${
                                  pt.isDefaultClientPrice ? 'bg-indigo-50/30' : ''
                                }`}
                              >
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    value={val}
                                    onChange={(e) =>
                                      handlePriceChange(p.id, pt.code, Number(e.target.value))
                                    }
                                    className={`w-28 text-center border rounded-lg px-2 py-1 font-extrabold focus:outline-none ${
                                      pt.isDefaultClientPrice
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 focus:border-indigo-600'
                                        : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                                    }`}
                                  />
                                  <span
                                    className={`text-[9px] font-bold mt-0.5 ${
                                      marginPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {marginPercent >= 0 ? `+${marginPercent}%` : `${marginPercent}%`} ustama
                                  </span>
                                </div>
                              </td>
                            );
                          })}

                        {/* Save Action */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleSaveProductPrices(p.id)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Saqlash</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                Jami <span className="font-bold text-slate-900">{filteredProducts.length}</span> ta tovardan{' '}
                <span className="font-bold text-indigo-700">
                  {filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredProducts.length)}
                </span>{' '}
                ko'rsatilmoqda
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mr-2">
                  <span>Sahifada:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                  >
                    <option value={25}>25 ta</option>
                    <option value={50}>50 ta</option>
                    <option value={100}>100 ta</option>
                    <option value={200}>200 ta</option>
                  </select>
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
                >
                  Oldingi
                </button>

                <span className="text-xs font-bold text-slate-800 px-2">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
                >
                  Keyingi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Price Type */}
      {isAddPriceTypeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Yangi Narx Turini Yaratish</h3>
              <button
                onClick={() => setIsAddPriceTypeOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePriceType} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Narx Turi NomiUz:</label>
                <input
                  type="text"
                  required
                  value={newPtName}
                  onChange={(e) => setNewPtName(e.target.value)}
                  placeholder="masalan: Super VIP Narx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kodi (slug):</label>
                <input
                  type="text"
                  value={newPtCode}
                  onChange={(e) => setNewPtCode(e.target.value)}
                  placeholder="masalan: super_vip"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Boshlang'ich Ustama Foizi (%):</label>
                <input
                  type="number"
                  value={newPtMarkup}
                  onChange={(e) => setNewPtMarkup(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tavsif (Ixtiyoriy):</label>
                <input
                  type="text"
                  value={newPtDesc}
                  onChange={(e) => setNewPtDesc(e.target.value)}
                  placeholder="Muayyan mijozlar va agentlar uchun..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="clientDefaultCheck"
                  checked={newPtIsClientDefault}
                  onChange={(e) => setNewPtIsClientDefault(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="clientDefaultCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Ushbu narxni Klient Paneli uchun asosiy narx qilish
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddPriceTypeOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Regos Import Modal */}
      <RegosImportModal
        isOpen={isRegosModalOpen}
        onClose={() => setIsRegosModalOpen(false)}
        categories={categories}
        existingProducts={products}
        onSuccess={() => {
          loadData();
          setToast('Regos narxlari muvaffaqiyatli sinxronlandi!');
          setTimeout(() => setToast(null), 3000);
        }}
      />
    </div>
  );
};
