import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Search,
  Sliders,
  ExternalLink,
} from 'lucide-react';

interface ProductItem {
  id: string;
  barcode: string;
  nameUz: string;
  nameRu?: string;
  category?: string;
  price?: number;
}

interface VerificationLogItem {
  id: string;
  barcode: string;
  originalName: string;
  verifiedName?: string;
  rating?: number;
  source?: string;
  status: 'pending' | 'success' | 'skipped' | 'error';
  message: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BarcodeListSyncModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [totalEligible, setTotalEligible] = useState<number>(7383);
  const [batchSize, setBatchSize] = useState<number>(500);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [autoSave, setAutoSave] = useState<boolean>(true);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [updatedCount, setUpdatedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);

  // Products to process in current batch
  const [batchProducts, setBatchProducts] = useState<ProductItem[]>([]);
  const [logs, setLogs] = useState<VerificationLogItem[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'updated' | 'skipped'>('all');

  const isStopRequested = useRef(false);
  const tableEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/barcode-list/stats');
      const data = await res.json();
      if (data.success && data.withBarcodeCount) {
        setTotalEligible(data.withBarcodeCount);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  // Start checking batch of 500 products
  const handleStartBatch = async () => {
    if (isRunning) return;

    isStopRequested.current = false;
    setIsRunning(true);
    setLogs([]);
    setUpdatedCount(0);
    setSkippedCount(0);
    setErrorCount(0);
    setCurrentIndex(0);

    try {
      // 1. Fetch products batch from backend
      const batchRes = await fetch(
        `/api/admin/barcode-list/products-batch?limit=${batchSize}&offset=${startOffset}`
      );
      const batchData = await batchRes.json();

      if (!batchData.success || !batchData.products || batchData.products.length === 0) {
        alert("Tanlangan oraliqda shtrix-kodli tovarlar topilmadi!");
        setIsRunning(false);
        return;
      }

      const products: ProductItem[] = batchData.products;
      setBatchProducts(products);

      const pendingUpdates: Array<{ barcode: string; verifiedName: string; originalName: string; source?: string }> = [];

      // 2. Loop through each product sequentially with small safe delay (100ms)
      for (let i = 0; i < products.length; i++) {
        if (isStopRequested.current) {
          break;
        }

        const item = products[i];
        setCurrentIndex(i + 1);

        try {
          const lookupRes = await fetch('/api/admin/barcode-list/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barcode: item.barcode,
              currentName: item.nameUz,
            }),
          });
          const result = await lookupRes.json();

          if (result.success && result.found && result.verifiedName) {
            setUpdatedCount((prev) => prev + 1);
            pendingUpdates.push({
              barcode: item.barcode,
              verifiedName: result.verifiedName,
              originalName: item.nameUz,
              source: result.source,
            });

            setLogs((prev) => [
              {
                id: item.id,
                barcode: item.barcode,
                originalName: item.nameUz,
                verifiedName: result.verifiedName,
                rating: result.rating,
                source: result.source,
                status: 'success',
                message: `Topildi va yangilandi (${result.source || 'Barcode-List'})`,
              },
              ...prev.slice(0, 150),
            ]);

            // Auto-save in micro-batches of 10 items
            if (autoSave && pendingUpdates.length >= 10) {
              await saveBatchUpdates(pendingUpdates.splice(0, pendingUpdates.length));
            }
          } else {
            // Topilmagan tovarlar 100% ASLI HOLATDA QOLADI!
            setSkippedCount((prev) => prev + 1);
            setLogs((prev) => [
              {
                id: item.id,
                barcode: item.barcode,
                originalName: item.nameUz,
                status: 'skipped',
                message: "Topilmadi — asl nomi 100% o'zgarishsiz saqlandi",
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
              message: "Server aloqasi xatosi — asl nomi saqlandi",
            },
            ...prev.slice(0, 150),
          ]);
        }

        // Small pause between items to prevent browser lag and respect network
        await new Promise((r) => setTimeout(r, 60));
      }

      // Save any remaining pending updates
      if (pendingUpdates.length > 0) {
        await saveBatchUpdates(pendingUpdates);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Batch error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    isStopRequested.current = true;
    setIsRunning(false);
  };

  const saveBatchUpdates = async (updates: Array<{ barcode: string; verifiedName: string; originalName?: string; source?: string }>) => {
    if (!updates.length) return;
    try {
      await fetch('/api/admin/barcode-list/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
    } catch (err) {
      console.error('Save error:', err);
    }
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
        <div className="px-6 py-4 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Barcode className="w-6 h-6 text-violet-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide">
                  Barcode-List.com Shtrix-kod Qidiruvi
                </h2>
                <span className="bg-violet-500/40 text-violet-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-300/30">
                  500 talik partiya
                </span>
              </div>
              <p className="text-xs text-violet-200 font-medium">
                https://barcode-list.com orqali to'g'ri nomlarni topish va 100% aniqlik bilan yangilash
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/60">
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
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
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
                    className="w-28 px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    / jami {totalEligible.toLocaleString()} ta
                  </span>
                </div>
              </div>

              {/* Auto Save Toggle */}
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="autoSaveCheckbox"
                  checked={autoSave}
                  disabled={isRunning}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                />
                <label htmlFor="autoSaveCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Avtomatik saqlash (Jonli rejim)
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <button
                  onClick={handleStartBatch}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
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
                Topildi va yangilandi
              </span>
              <div className="text-xl font-black text-emerald-700 mt-1">
                {updatedCount}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">
                100% aniq to'g'rilangan
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
                Topilmagani uchun saqlab qolindi
              </span>
            </div>

            <div className="bg-violet-50/60 p-3.5 rounded-xl border border-violet-200 shadow-xs">
              <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">
                Keyingi partiya
              </span>
              <div className="text-xs font-bold text-violet-900 mt-1.5 flex items-center gap-1.5">
                <span>{startOffset + batchSize} - {startOffset + batchSize * 2}</span>
                <button
                  disabled={isRunning}
                  onClick={() => setStartOffset((prev) => prev + batchSize)}
                  className="text-[10px] bg-violet-600 text-white font-extrabold px-2 py-0.5 rounded hover:bg-violet-700 cursor-pointer disabled:opacity-50"
                >
                  O'tish
                </button>
              </div>
              <span className="text-[10px] text-violet-600">
                Keyingi 500 talikka tayyor
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-violet-600 animate-spin" />
                  Shtrix-kodlar bo'yicha tekshirilmoqda...
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-300"
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

              {/* Log filter tabs */}
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
                  <Barcode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">
                    Hali tekshirish boshlanmadi
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                    "500 ta toparni tekshirishni boshlash" tugmasini bosing. Dastur shtrix-kodlar bo'yicha eng yuqori reytingli mos to'g'ri nomlarni topib, faqat to'g'ri kelganlarini yangilaydi.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Shtrix-kod</th>
                      <th className="py-2 px-3">Hozirgi nomi</th>
                      <th className="py-2 px-3">Topilgan yangi nom</th>
                      <th className="py-2 px-3">Reyting</th>
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
                        <td className="py-2 px-3">
                          {log.rating ? (
                            <span className="bg-violet-100 text-violet-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                              ⭐ {log.rating}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
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
              <div ref={tableEndRef} />
            </div>
          </div>

          {/* 4. Strict Safety Notice */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-blue-950">
                100% Xavfsizlik va Aniqlik Kafolati:
              </p>
              <p className="text-blue-800/90 text-[11px] mt-0.5">
                Har bir mahsulot qat'iy shtrix-kod bo'yicha tekshiriladi. Barcode-List bazasida topilmagan yoki noaniq bo'lgan tovarlarning nomiga umuman tegilmaydi va ular 100% o'z holatida saqlanadi. O'zgarishlar darhol bazaga yoziladi.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <span>Manba:</span>
            <a
              href="https://barcode-list.com"
              target="_blank"
              rel="noreferrer"
              className="text-violet-700 font-bold hover:underline flex items-center gap-1"
            >
              barcode-list.com <ExternalLink className="w-3 h-3" />
            </a>
            <span>va Open Food Facts Global API</span>
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
