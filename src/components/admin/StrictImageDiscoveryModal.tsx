import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  Play,
  Layers,
  Database,
  ExternalLink,
  Info,
  Check,
  FileText,
  Building2,
  Cpu,
} from 'lucide-react';
import { Product, Category, ImageDiscoveryResult, ImageCandidate } from '../../types';
import {
  discoverProductImage,
  batchDiscoverProductImages,
  runImageVerifierTestSuite,
  fetchImageVerificationLogs,
  manualVerifyProductImage,
} from '../../services/api';
import { AUTO_ASSIGN_THRESHOLD } from '../../utils/strictImageDiscoveryEngine';
import { ProductThumbnail } from '../common/ProductThumbnail';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  initialProduct?: Product | null;
  onProductUpdated?: (updatedProduct: Product) => void;
}

export const StrictImageDiscoveryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products,
  categories,
  initialProduct,
  onProductUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'sandbox' | 'logs'>('single');

  // Single Product State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [singleSearchQuery, setSingleSearchQuery] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [singleResult, setSingleResult] = useState<ImageDiscoveryResult | null>(null);

  // Batch State
  const [batchCategory, setBatchCategory] = useState('all');
  const [batchBrand, setBatchBrand] = useState('all');
  const [batchOnlyMissing, setBatchOnlyMissing] = useState(true);
  const [batchLimit, setBatchLimit] = useState(25);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchSummary, setBatchSummary] = useState<{
    totalProcessed: number;
    verifiedCount: number;
    rejectedCount: number;
    notFoundCount: number;
    results: ImageDiscoveryResult[];
  } | null>(null);

  // Sandbox Test Suite State
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  // Logs State
  const [logs, setLogs] = useState<ImageDiscoveryResult[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setSelectedProductId(initialProduct.id);
        runSingleDiscovery(initialProduct.id);
      } else if (products.length > 0 && !selectedProductId) {
        const firstMissing = products.find((p) => !p.image || p.image.trim() === '') || products[0];
        setSelectedProductId(firstMissing.id);
      }
      loadLogs();
    }
  }, [isOpen, initialProduct]);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await fetchImageVerificationLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const runSingleDiscovery = async (prodId?: string) => {
    const targetId = prodId || selectedProductId;
    if (!targetId) return;
    setIsInspecting(true);
    try {
      const res = await discoverProductImage(targetId, true);
      if (res.success) {
        setSingleResult(res.discoveryResult);
        if (onProductUpdated && res.product) {
          onProductUpdated(res.product);
        }
      }
    } catch (e) {
      console.error('Single discovery error:', e);
    } finally {
      setIsInspecting(false);
    }
  };

  const runBatchDiscovery = async () => {
    setIsBatchRunning(true);
    setBatchSummary(null);
    try {
      const res = await batchDiscoverProductImages({
        categoryId: batchCategory,
        brand: batchBrand,
        onlyMissing: batchOnlyMissing,
        limit: batchLimit,
      });
      if (res.success) {
        setBatchSummary({
          totalProcessed: res.totalProcessed,
          verifiedCount: res.verifiedCount,
          rejectedCount: res.rejectedCount,
          notFoundCount: res.notFoundCount,
          results: res.results,
        });
        loadLogs();
      }
    } catch (e) {
      console.error('Batch error:', e);
    } finally {
      setIsBatchRunning(false);
    }
  };

  const runTestSuite = async () => {
    setIsRunningTests(true);
    try {
      const res = await runImageVerifierTestSuite();
      if (res.success && res.testResults) {
        setTestResults(res.testResults);
      }
    } catch (e) {
      console.error('Test suite error:', e);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleManualAction = async (imageUrl: string, status: 'verified' | 'rejected') => {
    if (!selectedProductId) return;
    try {
      const res = await manualVerifyProductImage(selectedProductId, {
        imageUrl: status === 'verified' ? imageUrl : '',
        status,
        reason: status === 'verified' ? "Qo'lda ma'qullandi." : "Qo'lda rad etildi.",
      });
      if (res.success && onProductUpdated) {
        onProductUpdated(res.product);
      }
      runSingleDiscovery(selectedProductId);
    } catch (e) {
      console.error('Manual action error:', e);
    }
  };

  if (!isOpen) return null;

  // Filtered products list for selector
  const selectableProducts = products.filter((p) => {
    if (!singleSearchQuery) return true;
    const q = singleSearchQuery.toLowerCase();
    return (
      (p.nameUz && p.nameUz.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  // Extract unique brands for batch dropdown
  const uniqueBrands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Qat'iy Mahsulot Rasmi Qidiruvi & Verifikatsiya Dvigateli</h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                  Threshold: ≥{AUTO_ASSIGN_THRESHOLD}%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                100% aniq brend, model, SKU va GTIN tekshiruvi. Noto'g'ri yoki o'xshash rasmlar qat'iy rad etiladi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'single'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Search className="h-4 w-4" />
            Yagona Tovarni Tekshirish (Live Inspector)
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'batch'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Layers className="h-4 w-4" />
            Ommaviy Qidiruv (Batch Scanner)
          </button>
          <button
            onClick={() => {
              setActiveTab('sandbox');
              if (testResults.length === 0) runTestSuite();
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'sandbox'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Cpu className="h-4 w-4" />
            Xavfsizlik Test Sinovlari (Hard-Proof Sandbox)
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              loadLogs();
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <FileText className="h-4 w-4" />
            Audit Tarixi ({logs.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: SINGLE PRODUCT LIVE INSPECTOR */}
          {activeTab === 'single' && (
            <div className="space-y-6">
              {/* Product Selector Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tovarni Tanlang yoki Qidiring
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Nomi, brendi, shtrix-kodi yoki SKU..."
                        value={singleSearchQuery}
                        onChange={(e) => setSingleSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        runSingleDiscovery(e.target.value);
                      }}
                      className="max-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Tovarlar ro'yxati --</option>
                      {selectableProducts.slice(0, 100).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.brand ? `[${p.brand}] ` : ''}
                          {p.nameUz || p.nameRu} {p.image ? '✓' : '(Rasm yo\'q)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <button
                    onClick={() => runSingleDiscovery()}
                    disabled={isInspecting || !selectedProductId}
                    className="flex w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 ${isInspecting ? 'animate-spin' : ''}`} />
                    {isInspecting ? 'Tekshirilmoqda...' : "Qidirish & Verifikatsiya Qilish"}
                  </button>
                </div>
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Product Identity & Current Status */}
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Mahsulotning Aniq Identifikatori (Identity)
                    </h3>

                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                        <ProductThumbnail product={selectedProduct} size="lg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 line-clamp-2">
                          {selectedProduct.nameUz || selectedProduct.nameRu}
                        </p>
                        <p className="text-xs font-medium text-blue-600 mt-1">
                          Brend: <span className="font-bold">{selectedProduct.brand || "Ko'rsatilmagan"}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Kategoriya: {selectedProduct.categoryId}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <span className="text-slate-400 block font-medium">Shtrix-kod (GTIN/EAN)</span>
                        <span className="font-mono font-bold text-slate-700">{selectedProduct.barcode || 'Mavjud emas'}</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2">
                        <span className="text-slate-400 block font-medium">SKU / Artikul</span>
                        <span className="font-mono font-bold text-slate-700">{selectedProduct.sku || 'Mavjud emas'}</span>
                      </div>
                    </div>

                    {/* Current Image Decision Status */}
                    <div className="rounded-xl border p-3.5 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Amaldagi Rasm Holati:</span>
                        {selectedProduct.image ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {selectedProduct.imageConfidence ? `${selectedProduct.imageConfidence}% Tasdiqlangan` : 'Faol'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Xavfsiz Default Ikonka
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {selectedProduct.imageVerificationReason ||
                          (selectedProduct.image
                            ? "Mahsulot uchun tasdiqlangan rasm biriktirilgan."
                            : "Ishonch darajasi 90% dan past bo'lgani sababli noto'g'ri rasm qo'yilmasdan, standart vektor ikonka saqlanmoqda.")}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Candidates & Verification Breakdown */}
                  <div className="lg:col-span-2 space-y-4">
                    {singleResult ? (
                      <div className="space-y-4">
                        {/* Summary Banner */}
                        <div
                          className={`rounded-xl border p-4 shadow-sm flex items-start justify-between ${
                            singleResult.status === 'verified'
                              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                              : 'border-amber-200 bg-amber-50/70 text-amber-950'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {singleResult.status === 'verified' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                              )}
                              <h4 className="font-bold text-sm">
                                {singleResult.status === 'verified'
                                  ? `Qat'iy Tasdiqlandi: ${singleResult.confidenceScore}% Ishonch Darajasi`
                                  : `Qat'iy Rad Etildi (${singleResult.confidenceScore}%): Default Ikonka Saqlandi`}
                              </h4>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-600">
                              {singleResult.verificationReason}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-medium text-slate-500">
                              <span>Qidiruv so'rovlari: {singleResult.searchQueries.length} ta</span>
                              <span>•</span>
                              <span>Nomzodlar: {singleResult.candidatesFound} ta</span>
                              <span>•</span>
                              <span>Rad etilgan: {singleResult.candidatesRejected} ta</span>
                            </div>
                          </div>

                          {singleResult.assignedImageUrl && (
                            <div className="h-16 w-16 flex-shrink-0 rounded-lg border border-emerald-300 bg-white p-1 shadow-sm overflow-hidden">
                              <img
                                src={singleResult.assignedImageUrl}
                                alt="Assigned"
                                className="h-full w-full object-contain"
                              />
                            </div>
                          )}
                        </div>

                        {/* Candidates Grid */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Topilgan Nomzod Rasmlar va Ballar Tahlili</span>
                            <span>Eng yuqori ball saralangan</span>
                          </h4>

                          {singleResult.candidates.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                              <ShieldCheck className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                              <p className="font-semibold text-sm">Internetda ishonchli rasm topilmadi</p>
                              <p className="text-xs mt-1 text-slate-400">
                                Standart xavfsizlik qoidasiga binoan, mahsulotga noto'g'ri rasm berilmadi.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {singleResult.candidates.map((cand, idx) => (
                                <div
                                  key={cand.id}
                                  className={`rounded-xl border bg-white p-4 shadow-sm transition-all ${
                                    cand.isVerified
                                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                                      : 'border-slate-200 opacity-90'
                                  }`}
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="h-24 w-24 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden">
                                      <img
                                        src={cand.imageUrl}
                                        alt={cand.title}
                                        className="h-full w-full object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <h5 className="font-bold text-sm text-slate-900 line-clamp-1">
                                            {cand.title}
                                          </h5>
                                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                            <span className="font-semibold text-slate-700">{cand.sourceDomain}</span>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 font-medium">
                                              {cand.sourceType === 'official'
                                                ? 'Rasmiy Ishlab Chiqaruvchi'
                                                : cand.sourceType === 'authorized_retailer'
                                                ? 'Ishonchli Do\'kon'
                                                : 'Boshqa Manba'}
                                            </span>
                                          </p>
                                        </div>

                                        {/* Score Badge */}
                                        <div className="text-right flex-shrink-0">
                                          <div
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                                              cand.confidenceScore >= AUTO_ASSIGN_THRESHOLD
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                : 'bg-red-100 text-red-800 border border-red-300'
                                            }`}
                                          >
                                            {cand.confidenceScore >= AUTO_ASSIGN_THRESHOLD ? (
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                            ) : (
                                              <XCircle className="h-3.5 w-3.5" />
                                            )}
                                            {cand.confidenceScore}% Ishonch
                                          </div>
                                        </div>
                                      </div>

                                      {/* Scoring Breakdown Rules */}
                                      <div className="flex flex-wrap gap-1.5">
                                        {cand.scoreBreakdown.map((item, bIdx) => (
                                          <span
                                            key={bIdx}
                                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                              item.points > 0
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}
                                          >
                                            {item.rule}
                                          </span>
                                        ))}
                                      </div>

                                      {/* Rejection Reasons if Any */}
                                      {cand.rejectionReasons.length > 0 && (
                                        <div className="rounded-lg bg-red-50/80 p-2 text-xs text-red-700 space-y-0.5 border border-red-100">
                                          {cand.rejectionReasons.map((r, rIdx) => (
                                            <p key={rIdx} className="flex items-center gap-1.5">
                                              <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                              {r}
                                            </p>
                                          ))}
                                        </div>
                                      )}

                                      {/* Manual Admin Override Actions */}
                                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                        <a
                                          href={cand.sourceUrl || cand.imageUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          <ExternalLink className="h-3 w-3" /> Manbani ochish
                                        </a>

                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleManualAction(cand.imageUrl, 'verified')}
                                            className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                          >
                                            Qo'lda Biriktirish
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                        <Search className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                        <p className="font-semibold text-slate-700 text-sm">Tovarni tanlab tekshiruvni ishga tushiring</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Tizim internetdagi rasmiy ishlab chiqaruvchi va ishonchli manbalardan qidirib, barcha qat'iy
                          filtrlarni hisoblab chiqadi.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BATCH IMAGE SCANNER */}
          {activeTab === 'batch' && (
            <div className="space-y-6">
              {/* Batch Controls */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  Ommaviy Skanerlash Parametrlari
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Kategoriya</label>
                    <select
                      value={batchCategory}
                      onChange={(e) => setBatchCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Barcha Kategoriyalar</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameUz || c.nameRu}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Brend</label>
                    <select
                      value={batchBrand}
                      onChange={(e) => setBatchBrand(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Barcha Brendlar</option>
                      {uniqueBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Tovarlar Soni (Limit)</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={batchLimit}
                      onChange={(e) => setBatchLimit(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchOnlyMissing}
                        onChange={(e) => setBatchOnlyMissing(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Faqat rasmi yo'q tovarlar
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={runBatchDiscovery}
                    disabled={isBatchRunning}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    <Play className={`h-4 w-4 ${isBatchRunning ? 'animate-spin' : ''}`} />
                    {isBatchRunning ? 'Ommaviy Qidirilmoqda...' : 'Ommaviy Qidiruvni Boshlash'}
                  </button>
                </div>
              </div>

              {/* Batch Results Overview */}
              {batchSummary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Jami Ko'rildi</span>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">{batchSummary.totalProcessed}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <span className="text-xs font-bold text-emerald-700 uppercase">Tasdiqlandi (≥90%)</span>
                      <p className="text-2xl font-extrabold text-emerald-700 mt-1">{batchSummary.verifiedCount}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <span className="text-xs font-bold text-amber-700 uppercase">Rad Etildi (&lt;90%)</span>
                      <p className="text-2xl font-extrabold text-amber-700 mt-1">{batchSummary.rejectedCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <span className="text-xs font-bold text-slate-600 uppercase">Topilmadi / Standart Ikonka</span>
                      <p className="text-2xl font-extrabold text-slate-700 mt-1">{batchSummary.notFoundCount}</p>
                    </div>
                  </div>

                  {/* Batch Details Table */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Tovar</th>
                          <th className="py-3 px-4">Brend / Model</th>
                          <th className="py-3 px-4">Ball / Holat</th>
                          <th className="py-3 px-4">Natija</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchSummary.results.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                              {r.assignedImageUrl ? (
                                <img
                                  src={r.assignedImageUrl}
                                  alt=""
                                  className="h-8 w-8 object-contain rounded border border-slate-200"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                              <span>{r.productName}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="font-bold text-slate-800">{r.brand}</span>
                              {r.modelNumber ? ` • ${r.modelNumber}` : ''}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`rounded-full px-2 py-0.5 font-bold ${
                                  r.status === 'verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {r.confidenceScore}% • {r.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={r.verificationReason}>
                              {r.verificationReason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HARD-PROOF SANDBOX TEST SUITE */}
          {activeTab === 'sandbox' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Qat'iy Rad Etish va Moslik Sinovlari (Verification Engine Sandbox)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tizimning o'xshash ammo noto'g'ri mahsulotlarni qat'iy rad etishini tasdiqlovchi test to'plami.
                  </p>
                </div>
                <button
                  onClick={runTestSuite}
                  disabled={isRunningTests}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow"
                >
                  <RefreshCw className={`h-4 w-4 ${isRunningTests ? 'animate-spin' : ''}`} />
                  {isRunningTests ? 'Sinovlar Bajarilmoqda...' : 'Sinovlarni Qayta Bajarish'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testResults.map((t, idx) => {
                  const res: ImageDiscoveryResult = t.discoveryResult;
                  const isSuccessMatch =
                    (t.testId.includes('rejection') || t.testId.includes('vs') || t.testId.includes('generic'))
                      ? res.status === 'rejected' || res.status === 'not_found' || (res.selectedImage && res.selectedImage.confidenceScore < 90) || (t.testId.includes('s24_ultra') && res.status === 'verified')
                      : res.status === 'verified';

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{t.title}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              res.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {res.confidenceScore}% • {res.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
                          <p>
                            <span className="font-semibold text-slate-700">Kutilgan xatti-harakat:</span>{' '}
                            {t.expectedOutcome}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-700">Dvigatel xulosasi:</span>{' '}
                            {res.verificationReason}
                          </p>
                        </div>
                      </div>

                      {/* Score breakdown tags */}
                      {res.candidates.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                          {res.candidates[0].scoreBreakdown.map((sb, sbIdx) => (
                            <span
                              key={sbIdx}
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                sb.points > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {sb.rule}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Rasm Qidiruvlari va Qarorlari Tarixi ({logs.length} ta yozuv)
                </h3>
                <button
                  onClick={loadLogs}
                  disabled={isLoadingLogs}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-semibold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  Yangilash
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
                  Hozircha audit yozuvlari mavjud emas.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {log.brand ? `[${log.brand}] ` : ''}
                          {log.productName}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(log.verifiedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-600">{log.verificationReason}</p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                        <span
                          className={`rounded px-1.5 py-0.2 font-bold ${
                            log.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.status.toUpperCase()} ({log.confidenceScore}%)
                        </span>
                        <span>•</span>
                        <span>Nomzodlar: {log.candidatesFound} ta</span>
                        {log.assignedImageUrl && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold truncate max-w-xs">
                              {log.assignedImageUrl}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-500" />
            Xavfsizlik qoidasi: Agar ishonch 90% dan past bo'lsa, hech qanday rasm tayinlanmaydi va default ikonka
            saqlanadi.
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
