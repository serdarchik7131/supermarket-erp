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
} from 'lucide-react';
import { Product, Category, PriceType } from '../../types';
import { getAutoProductImage } from '../../utils/productUtils';
import {
  fetchProducts,
  fetchCategories,
  fetchPriceTypes,
  createPriceType,
  updatePriceType,
  applyPriceMarkup,
  updateProductPrices,
} from '../../services/api';

export const PricesModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local state for product price edits
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number>>>({});

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
      const [prods, cats, pts] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchPriceTypes(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setPriceTypes(pts);

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

  // Set active default price shown to Clients
  const handleSetDefaultClientPrice = async (ptId: string) => {
    try {
      await updatePriceType(ptId, { isDefaultClientPrice: true });
      showToast("Mijoz paneli uchun asosiy narx o'zgartirildi!");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter products list
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      p.nameUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchesCat && matchesQuery;
  });

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
                Narxlar va Narxlash Bo'limi (Multi-Price System)
              </h1>
              <p className="text-xs text-slate-500">
                Prixod (kirim/tannarx), Chakana (Roznitsa), Ulgurji (Optom) va VIP narxlarini qo'lda yoki foiz bilan belgilash.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddPriceTypeOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Narx Turi Qo'shish</span>
          </button>

          <button
            onClick={handleSaveAllPrices}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>O'zgarishlarni Saqlash</span>
          </button>
        </div>
      </div>

      {/* Rules Notice Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-sky-500 text-white rounded-xl shrink-0 mt-0.5">
            <Eye className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sky-950 text-xs uppercase tracking-wider">
              📱 Klient Paneli Qoidasi
            </h4>
            <p className="text-xs text-sky-800 leading-relaxed">
              B2C xaridor va MiniApp xaridorlariga <strong>faqat bitta belgilangan narx</strong> (Chakana / Roznitsa) ko'rinadi. Boshqa ulgurji va kirim narxlar klientga hech qachon oshkor etilmaydi.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
            <LockIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">
              💼 Agent Paneli va Huquqlar
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Agentlarga admin tomonidan istalgan narx turi (Optom, Roznitsa, VIP) va do'kon kategoriyalari biriktirilishi mumkin. Agent ushbu sozlamalarni o'zgartira olmaydi.
            </p>
          </div>
        </div>
      </div>

      {/* Price Tiers Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {priceTypes.map((pt) => (
          <div
            key={pt.id}
            className={`bg-white rounded-2xl p-4 border transition-all relative overflow-hidden ${
              pt.isDefaultClientPrice
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {pt.isDefaultClientPrice && (
              <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-xl tracking-wider">
                Klient Paneli
              </span>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 font-mono uppercase">{pt.code}</span>
              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                +{pt.defaultMarkupPercent}%
              </span>
            </div>
            <div className="font-extrabold text-sm text-slate-900 mb-1">{pt.nameUz}</div>
            <p className="text-[11px] text-slate-500 line-clamp-2">{pt.description || 'Standart narxlash turi'}</p>

            {!pt.isDefaultClientPrice && pt.code !== 'prixod' && (
              <button
                onClick={() => handleSetDefaultClientPrice(pt.id)}
                className="mt-3 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
              >
                <span>Klient paneli uchun biriktirish</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Auto Markup Calculator (+Foiz biriktirish) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl border border-indigo-900/50">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-sm tracking-wide">
            Avtomatik Foiz Orqali Narxlarni Biriktirish (+Ustama Hisoblagich)
          </h3>
        </div>
        <p className="text-xs text-slate-300 mb-4">
          Prixod (Tannarx/Kirim) narxiga belgilangan foizni qo'shib, tanlangan narx turiga avtomatik biriktiring.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Narx Turi:</label>
            <select
              value={targetPriceCode}
              onChange={(e) => setTargetPriceCode(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              {priceTypes
                .filter((p) => p.code !== 'prixod')
                .map((pt) => (
                  <option key={pt.id} value={pt.code}>
                    {pt.nameUz} ({pt.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Kategoriya:</label>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
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
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Ustama Foiz (%):</label>
            <div className="relative">
              <input
                type="number"
                value={markupPercentInput}
                onChange={(e) => setMarkupPercentInput(Number(e.target.value))}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold pl-8 focus:outline-none focus:border-indigo-500"
                placeholder="15"
              />
              <Percent className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <button
            onClick={handleApplyMarkup}
            disabled={isApplyingMarkup}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
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

          <div className="text-xs font-bold text-slate-500">
            Jami: <span className="text-slate-900 font-extrabold">{filteredProducts.length}</span> ta mahsulot
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
              {filteredProducts.map((p) => {
                const pEdits = editedPrices[p.id] || {};
                const costP = pEdits.prixod ?? p.costPrice ?? 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Product Name & SKU */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getAutoProductImage(p)}
                          alt={p.nameUz}
                          className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                        />
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
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1"
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
      </div>

      {/* Modal: New Price Type */}
      {isAddPriceTypeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Yangi Narx Turini Yaratish</h3>
              <button
                onClick={() => setIsAddPriceTypeOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
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
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="clientDefaultCheck" className="text-xs font-semibold text-slate-800">
                  Ushbu narxni Klient Paneli uchun asosiy narx qilish
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddPriceTypeOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
