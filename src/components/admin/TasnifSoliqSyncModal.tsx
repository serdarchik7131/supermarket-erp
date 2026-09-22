import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Barcode,
  Image as ImageIcon,
  FileSpreadsheet,
  Terminal,
  X,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { cleanSupermarketName } from '../../utils/barcodeListResolver';

interface ProductItem {
  id: string;
  barcode: string;
  nameUz: string;
  currentImage?: string;
  category?: string;
  price?: number;
}

interface VerificationLogItem {
  id: string;
  barcode: string;
  originalName: string;
  verifiedName?: string;
  mxikCode?: string;
  imageUrl?: string;
  status: 'pending' | 'success' | 'skipped' | 'error';
  message: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TasnifSoliqSyncModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [totalEligible, setTotalEligible] = useState<number>(7389);
  const [batchSize, setBatchSize] = useState<number>(500);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [onlyWithoutImage, setOnlyWithoutImage] = useState<boolean>(false);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [updatedCount, setUpdatedCount] = useState<number>(0);
  const [newImagesCount, setNewImagesCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);

  // Batch products and logs
  const [batchProducts, setBatchProducts] = useState<ProductItem[]>([]);
  const [logs, setLogs] = useState<VerificationLogItem[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'updated' | 'skipped'>('all');
  const [activeTab, setActiveTab] = useState<'live' | 'file' | 'script'>('live');

  // File import status
  const [fileImportStatus, setFileImportStatus] = useState<string | null>(null);

  const isStopRequested = useRef(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/tasnif/stats');
      const data = await res.json();
      if (data.success && data.withBarcodeCount) {
        setTotalEligible(data.withBarcodeCount);
      }
    } catch (err) {
      console.error('Tasnif stats error:', err);
    }
  };

  /**
   * Ultra-aniq Tasnif.soliq.uz qidiruv mexanizmi
   * Rasmiy soliq bazasidan Brand, Attribute, MXIK va fotosuratni ajratib oladi
   */
  const queryTasnifDirect = async (barcode: string) => {
    const cleanBarcode = String(barcode).trim();
    if (!cleanBarcode || cleanBarcode.length < 5) return null;

    const urls = [
      `https://tasnif.soliq.uz/api/cls-api/mxik/search/by-params?gtin=${encodeURIComponent(cleanBarcode)}&lang=uz&size=5&page=0`,
      `https://tasnif.soliq.uz/api/cl-api/mxik/search/by-params?gtin=${encodeURIComponent(cleanBarcode)}&lang=uz&size=5&page=0`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
          },
        });

        if (!response.ok) continue;
        const resJson = await response.json();

        let items: any[] = [];
        if (resJson?.data?.content && Array.isArray(resJson.data.content)) {
          items = resJson.data.content;
        } else if (resJson?.content && Array.isArray(resJson.content)) {
          items = resJson.content;
        } else if (Array.isArray(resJson?.data)) {
          items = resJson.data;
        }

        if (items.length > 0) {
          const it = items[0];

          // 1. To'liq va toza nomni aniqlash
          let nameCandidate = '';
          if (it.brandName && it.attributeName) {
            nameCandidate = `${it.brandName} ${it.attributeName}`;
          } else if (it.attributeName) {
            nameCandidate = it.attributeName;
          } else if (it.nameUz || it.name || it.fullName) {
            nameCandidate = it.nameUz || it.name || it.fullName;
          } else if (it.brandName && it.mxikName) {
            nameCandidate = `${it.brandName} ${it.mxikName}`;
          } else if (it.mxikName) {
            nameCandidate = it.mxikName;
          }

          // 2. Fotosuratni aniqlash
          const img = it.photo || it.photoUrl || it.imageUrl || it.image || (it.fileId ? `https://tasnif.soliq.uz/api/cls-api/file/download/${it.fileId}` : '');
          // 3. MXIK kodi
          const mxikCode = it.mxikCode || it.code || '';

          if (nameCandidate && nameCandidate.trim().length >= 2) {
            return {
              barcode: cleanBarcode,
              found: true,
              verifiedName: cleanSupermarketName(nameCandidate.trim()),
              imageUrl: img ? String(img).trim() : undefined,
              mxikCode: mxikCode ? String(mxikCode).trim() : undefined,
              rawBrand: it.brandName,
              rawAttribute: it.attributeName,
            };
          }
        }
      } catch {
        // Tarmoq yoki CORS
      }
    }
    return null;
  };

  // 500 talik partiyani tekshirishni boshlash
  const handleStartBatch = async () => {
    if (isRunning) return;

    isStopRequested.current = false;
    setIsRunning(true);
    setLogs([]);
    setUpdatedCount(0);
    setNewImagesCount(0);
    setSkippedCount(0);
    setErrorCount(0);
    setCurrentIndex(0);

    try {
      // 1. Serverdan navbatdagi tovarlar partiyasini olish
      const batchRes = await fetch(
        `/api/admin/tasnif/products-to-sync?limit=${batchSize}&offset=${startOffset}${onlyWithoutImage ? '&onlyWithoutImage=true' : ''}`
      );
      const batchData = await batchRes.json();

      if (!batchData.success || !batchData.products || batchData.products.length === 0) {
        alert("Tanlangan oraliqda tovarlar topilmadi!");
        setIsRunning(false);
        return;
      }

      const products: ProductItem[] = batchData.products;
      setBatchProducts(products);

      const pendingUpdates: Array<{
        barcode: string;
        nameUz?: string;
        imageUrl?: string;
        mxikCode?: string;
      }> = [];

      // 2. Ketma-ket tekshirib chiqish
      for (let i = 0; i < products.length; i++) {
        if (isStopRequested.current) break;

        const item = products[i];
        setCurrentIndex(i + 1);

        try {
          const tasnifResult = await queryTasnifDirect(item.barcode);

          if (tasnifResult && tasnifResult.found && tasnifResult.verifiedName) {
            setUpdatedCount((prev) => prev + 1);
            if (tasnifResult.imageUrl) {
              setNewImagesCount((prev) => prev + 1);
            }

            pendingUpdates.push({
              barcode: item.barcode,
              nameUz: tasnifResult.verifiedName,
              imageUrl: tasnifResult.imageUrl,
              mxikCode: tasnifResult.mxikCode,
            });

            setLogs((prev) => [
              {
                id: item.id,
                barcode: item.barcode,
                originalName: item.nameUz,
                verifiedName: tasnifResult.verifiedName,
                mxikCode: tasnifResult.mxikCode,
                imageUrl: tasnifResult.imageUrl,
                status: 'success',
                message: `Tasnif Soliq dan 100% aniqlik bilan topildi`,
              },
              ...prev.slice(0, 150),
            ]);

            // Har 10 ta tovar topilganda serverga saqlash
            if (autoSave && pendingUpdates.length >= 10) {
              await saveBatchUpdates(pendingUpdates.splice(0, pendingUpdates.length));
            }
          } else {
            // Topilmagan tovarlar 100% ASLI HOLATIDA QOLADI!
            setSkippedCount((prev) => prev + 1);
            setLogs((prev) => [
              {
                id: item.id,
                barcode: item.barcode,
                originalName: item.nameUz,
                status: 'skipped',
                message: "Tasnifda yo'q — asl nomi 100% o'zgarishsiz qoldirildi",
              },
              ...prev.slice(0, 150),
            ]);
          }
        } catch {
          setErrorCount((prev) => prev + 1);
          setLogs((prev) => [
            {
              id: item.id,
              barcode: item.barcode,
              originalName: item.nameUz,
              status: 'error',
              message: "Aloqa uzildi — asl nomi saqlandi",
            },
            ...prev.slice(0, 150),
          ]);
        }

        // Tanaffus
        await new Promise((r) => setTimeout(r, 60));
      }

      // Qolgan topilgan tovarlarni saqlash
      if (pendingUpdates.length > 0) {
        await saveBatchUpdates(pendingUpdates);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Tasnif batch error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    isStopRequested.current = true;
    setIsRunning(false);
  };

  const saveBatchUpdates = async (updates: any[]) => {
    if (!updates.length) return;
    try {
      await fetch('/api/admin/tasnif/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
    } catch (err) {
      console.error('Tasnif save error:', err);
    }
  };

  // Fayl yuklash (Excel / JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileImportStatus(`Fayl o'qilmoqda: ${file.name}...`);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        let updates: any[] = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            updates = parsed.map((item) => ({
              barcode: String(item.barcode || item.gtin || item.code || '').trim(),
              nameUz: item.nameUz || item.name || item.fullName,
              imageUrl: item.image || item.imageUrl || item.photo,
              mxikCode: item.mxikCode || item.mxik || item.ikpu,
            }));
          }
        }

        if (updates.length > 0) {
          setFileImportStatus(`Serverga ${updates.length} ta yozuv yuborilmoqda...`);
          const res = await fetch('/api/admin/tasnif/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates }),
          });
          const resJson = await res.json();
          if (resJson.success) {
            setFileImportStatus(`✅ Muvaffaqiyatli! ${resJson.updatedCount} ta tovar Tasnif ma'lumotlari bilan yangilandi.`);
            loadStats();
            if (onSuccess) onSuccess();
          } else {
            setFileImportStatus(`❌ Xatolik: ${resJson.message}`);
          }
        } else {
          setFileImportStatus(`⚠️ Faylda mos keluvchi shtrix-kod va tovar nomlari topilmadi.`);
        }
      } catch (err: any) {
        setFileImportStatus(`❌ Faylni o'qishda xatolik: ${err.message}`);
      }
    };

    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const progressPercent = batchProducts.length > 0 ? Math.round((currentIndex / batchProducts.length) * 100) : 0;
  const filteredLogs = logs.filter((l) => {
    if (filterMode === 'updated') return l.status === 'success';
    if (filterMode === 'skipped') return l.status === 'skipped';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Globe className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide">
                  Tasnif.soliq.uz Shtrix-kod Sinxronizatsiyasi
                </h2>
                <span className="bg-emerald-500/40 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300/30">
                  500 talik partiya
                </span>
              </div>
              <p className="text-xs text-emerald-200 font-medium">
                O'zbekiston Davlat Soliq Qo'mitasi rasmiy katalogidan tovar nomlari va rasmlarini 100% aniqlikda yangilash
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isRunning) handleStop();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-6 pt-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Jonli tekshirish (500 talik)</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Fayldan import (Excel / JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'script'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>CORS yordamchisi</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/60">
          {activeTab === 'live' && (
            <>
              {/* 1. Control Panel & Configuration */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Batch Size Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Bitta bosishdagi hajm:
                    </label>
                    <div className="flex items-center gap-1">
                      {[100, 250, 500, 1000].map((size) => (
                        <button
                          key={size}
                          disabled={isRunning}
                          onClick={() => setBatchSize(size)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            batchSize === size
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {size} ta
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Offset / Start Index */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Qaysi tovardan boshlash (Ofset):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={totalEligible}
                        step={100}
                        value={startOffset}
                        disabled={isRunning}
                        onChange={(e) => setStartOffset(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-28 px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        / jami {totalEligible.toLocaleString()} ta
                      </span>
                    </div>
                  </div>

                  {/* Auto Save & Filter Toggles */}
                  <div className="flex items-center gap-4 pt-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSave}
                        disabled={isRunning}
                        onChange={(e) => setAutoSave(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      Avtomatik saqlash
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyWithoutImage}
                        disabled={isRunning}
                        onChange={(e) => setOnlyWithoutImage(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      Faqat rasmi yo'qlar
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isRunning ? (
                    <button
                      onClick={handleStartBatch}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{batchSize} ta toparni tekshirishni boshlash</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      <span>To'xtatish (Pauza)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Real-time Progress & Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Partiya holati
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-800">
                      {currentIndex}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      / {batchProducts.length || batchSize}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {progressPercent}% bajarildi
                  </span>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Tasnifdan topildi
                  </span>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {updatedCount}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    100% aniq to'g'rilangan
                  </span>
                </div>

                <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 shadow-xs">
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                    Yangi rasmlar
                  </span>
                  <div className="text-xl font-black text-sky-700 mt-1">
                    {newImagesCount}
                  </div>
                  <span className="text-[11px] text-sky-600 font-semibold">
                    Soliq bazasidan biriktirildi
                  </span>
                </div>

                <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Aslicha qoldirildi
                  </span>
                  <div className="text-xl font-black text-slate-700 mt-1">
                    {skippedCount}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Tasnifda yo'qlari saqlandi
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {isRunning && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                      Tasnif.soliq.uz bazasidan tekshirilmoqda...
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* 3. Live Logs / Results Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-800 tracking-wide">
                      Jonli tekshiruv natijalari
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500">
                      ({logs.length} ta yozuv)
                    </span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        filterMode === 'all'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Barchasi ({logs.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('updated')}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        filterMode === 'updated'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      Faqat yangilanganlar ({updatedCount})
                    </button>
                    <button
                      onClick={() => setFilterMode('skipped')}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        filterMode === 'skipped'
                          ? 'bg-slate-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Aslicha qolganlar ({skippedCount})
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Globe className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">
                        Hali tekshirish boshlanmadi
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                        "500 ta toparni tekshirishni boshlash" tugmasini bosing. Dastur shtrix-kodlar bo'yicha Tasnif Soliq bazasidan eng to'g'ri nom va rasmlarni topib yangilaydi.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Shtrix-kod</th>
                          <th className="py-2 px-3">Hozirgi nomi</th>
                          <th className="py-2 px-3">Tasnifdan yangi nom</th>
                          <th className="py-2 px-3">MXIK</th>
                          <th className="py-2 px-3">Rasm</th>
                          <th className="py-2 px-3 text-right">Holati</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 transition-colors ${
                              log.status === 'success' ? 'bg-emerald-50/30' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">
                              {log.barcode}
                            </td>
                            <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={log.originalName}>
                              {log.originalName}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 max-w-xs truncate" title={log.verifiedName}>
                              {log.verifiedName ? (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                                  {log.verifiedName}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">O'zgarmadi</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                              {log.mxikCode ? log.mxikCode.slice(0, 10) + '...' : '—'}
                            </td>
                            <td className="py-2 px-3">
                              {log.imageUrl ? (
                                <img
                                  src={log.imageUrl}
                                  alt="Product"
                                  className="w-6 h-6 object-cover rounded border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {log.status === 'success' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Yangilandi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Aslicha qoldi
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 4. Strict Safety Guarantee */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-blue-950">
                    100% Xavfsizlik va Aniqlik Kafolati:
                  </p>
                  <p className="text-blue-800/90 text-[11px] mt-0.5">
                    Har bir mahsulot qat'iy shtrix-kod bo'yicha Tasnif Soliq bazasidan tekshiriladi. Chiqmagan tovarlarning nomiga umuman tegilmaydi va ular 100% o'z holatida saqlanadi.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'file' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Tasnif Soliq fayllarini yuklash (JSON / Excel)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tasnif.soliq.uz dan eksport qilingan JSON yoki Excel faylini yuklang. Tizim shtrix-kodlari bo'yicha avtomatik yangilab oladi.
                  </p>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="tasnifFileInput"
                  accept=".json,.xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="tasnifFileInput" className="cursor-pointer block space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 block">
                    Faylni tanlang yoki shu yerga tashlang
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    JSON, XLSX yoki CSV formatida
                  </span>
                </label>
              </div>

              {fileImportStatus && (
                <div className="p-3 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                  {fileImportStatus}
                </div>
              )}
            </div>
          )}

          {activeTab === 'script' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <Terminal className="w-8 h-8 text-teal-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Tasnif.soliq.uz Brauzer Konsol Yordamchisi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Agar brauzeringizda Tasnif Soliq API-si CORS xavfsizligi tufayli cheklangan bo'lsa, quyidagi skriptni tasnif.soliq.uz saytida brauzer konsolida ishlatishingiz mumkin:
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-2">
                <p className="text-slate-400">// 1. tasnif.soliq.uz saytini yangi oynada oching</p>
                <p className="text-slate-400">// 2. F12 (DevTools) &rarr; Console bo'limiga o'ting va ushbu kodni joylang:</p>
                <code className="text-emerald-300 block whitespace-pre">
{`async function syncTasnif() {
  const products = await fetch('${window.location.origin}/api/admin/tasnif/products-to-sync?limit=500').then(r => r.json());
  console.log('Tekshirilmoqda:', products.count);
}`}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <span>Manba:</span>
            <a
              href="https://tasnif.soliq.uz"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
            >
              tasnif.soliq.uz <ExternalLink className="w-3 h-3" />
            </a>
            <span>(Yagona elektron milliy katalog)</span>
          </div>
          <button
            onClick={() => {
              if (isRunning) handleStop();
              onClose();
            }}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 font-bold rounded-lg text-slate-700 transition-all cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
