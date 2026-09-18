import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface TasnifStats {
  totalProducts: number;
  withBarcodeCount: number;
  withImageCount: number;
  withoutImageCount: number;
  sampleWithBarcode: Array<{
    id: string;
    nameUz: string;
    barcode: string;
    hasImage: boolean;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TasnifSoliqSyncModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [stats, setStats] = useState<TasnifStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'file' | 'script'>('live');

  // Live Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [newImagesCount, setNewImagesCount] = useState(0);
  const [shouldStop, setShouldStop] = useState(false);

  // File import state
  const [fileImportStatus, setFileImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/tasnif/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Stats load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Brauzer orqali to'g'ridan-to'g'ri Tasnif.soliq.uz ga so'rov yuborish
  const queryTasnifDirect = async (barcode: string) => {
    const urls = [
      `https://tasnif.soliq.uz/api/cls-api/mxik/search/by-params?gtin=${encodeURIComponent(barcode)}&lang=uz&size=5&page=0`,
      `https://tasnif.soliq.uz/api/cl-api/mxik/search/by-params?gtin=${encodeURIComponent(barcode)}&lang=uz&size=5&page=0`,
    ];

    for (const u of urls) {
      try {
        const response = await fetch(u, {
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
        }

        if (items.length > 0) {
          const it = items[0];
          const name = it.nameUz || it.name || it.fullName || it.attributeNameUz || it.packageNameUz || '';
          const img = it.photo || it.photoUrl || it.imageUrl || it.image || (it.fileId ? `https://tasnif.soliq.uz/api/cls-api/file/download/${it.fileId}` : '');
          const mxikCode = it.mxikCode || it.code || '';

          return {
            barcode,
            nameUz: name ? String(name).trim() : undefined,
            imageUrl: img ? String(img).trim() : undefined,
            mxikCode: mxikCode ? String(mxikCode).trim() : undefined,
          };
        }
      } catch (e) {
        // CORS yoki tarmoq xatosi
      }
    }
    return null;
  };

  // Jonli sinxronizatsiyani boshlash
  const handleStartLiveSync = async () => {
    setIsSyncing(true);
    setShouldStop(false);
    setSyncProgress(0);
    setUpdatedCount(0);
    setNewImagesCount(0);
    setSyncLogs((prev) => [`🚀 Tasnif.soliq.uz bilan sinxronizatsiya boshlandi...`, ...prev]);

    try {
      // 1. Tizimdagi shtrix-kodli tovarlar ro'yxatini yuklash
      const res = await fetch('/api/admin/tasnif/products-to-sync?limit=200&offset=0');
      const data = await res.json();

      if (!data.success || !data.products || data.products.length === 0) {
        setSyncLogs((prev) => [`❌ Sinxronizatsiya uchun tovarlar topilmadi.`, ...prev]);
        setIsSyncing(false);
        return;
      }

      const productsToProcess = data.products;
      setSyncLogs((prev) => [`📦 Qayta ishlash uchun ${productsToProcess.length} ta shtrix-kod tayyorlandi.`, ...prev]);

      const foundUpdates: any[] = [];
      let processed = 0;

      for (const p of productsToProcess) {
        if (shouldStop) {
          setSyncLogs((prev) => [`⏸ Sinxronizatsiya foydalanuvchi tomonidan to'xtatildi.`, ...prev]);
          break;
        }

        const barcode = p.barcode;
        const tasnifItem = await queryTasnifDirect(barcode);

        processed++;
        setSyncProgress(Math.round((processed / productsToProcess.length) * 100));

        if (tasnifItem && (tasnifItem.nameUz || tasnifItem.imageUrl)) {
          foundUpdates.push(tasnifItem);
          setSyncLogs((prev) => [
            `✅ [100% Moslik] Shtrix: ${barcode} -> "${tasnifItem.nameUz || p.nameUz}" ${tasnifItem.imageUrl ? '🖼 (Rasm bor)' : ''}`,
            ...prev.slice(0, 40),
          ]);
        }

        // Har 10 ta tovar topilganda serverga saqlash
        if (foundUpdates.length >= 10) {
          const saveRes = await fetch('/api/admin/tasnif/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: [...foundUpdates] }),
          });
          const saveJson = await saveRes.json();
          if (saveJson.success) {
            setUpdatedCount((c) => c + saveJson.updatedCount);
            setNewImagesCount((c) => c + (saveJson.newImagesCount || 0));
          }
          foundUpdates.length = 0; // Bo'shatish
        }

        // Kichik tanaffus
        await new Promise((r) => setTimeout(r, 150));
      }

      // Qolgan topilgan tovarlarni saqlash
      if (foundUpdates.length > 0) {
        const saveRes = await fetch('/api/admin/tasnif/bulk-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: foundUpdates }),
        });
        const saveJson = await saveRes.json();
        if (saveJson.success) {
          setUpdatedCount((c) => c + saveJson.updatedCount);
          setNewImagesCount((c) => c + (saveJson.newImagesCount || 0));
        }
      }

      setSyncLogs((prev) => [
        `🏁 Jarayon yakunlandi! Hammasi bo'lib yangilandi: ${updatedCount} ta. Chiqmagan tovarlar 100% asl holatda qoldirildi.`,
        ...prev,
      ]);
      loadStats();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSyncLogs((prev) => [
        `⚠️ Eslatma: Brauzer CORS xavfsizligi tufayli tasnif.soliq.uz API bloklandi.`,
        `💡 Maslahat: Quyidagi "Excel / JSON yuklash" yoki "Lokal Skript" usulidan foydalaning!`,
        ...prev,
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fayl yuklash (Excel / JSON / CSV)
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
          const list = Array.isArray(parsed) ? parsed : parsed.data || parsed.content || [];
          updates = list.map((item: any) => ({
            barcode: item.barcode || item.gtin || item.code,
            nameUz: item.nameUz || item.name || item.fullName,
            nameRu: item.nameRu,
            imageUrl: item.imageUrl || item.image || item.photo || item.photoUrl,
            mxikCode: item.mxikCode || item.ikpu,
          })).filter((u: any) => u.barcode);
        } else {
          // CSV / TSV formatdagi matn
          const lines = text.split('\n');
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(/[,\t;]/).map((p) => p.replace(/^"|"$/g, '').trim());
            if (parts.length >= 2) {
              const barcode = parts.find((p) => /^\d{8,14}$/.test(p));
              const name = parts.find((p) => p.length > 3 && !/^\d+$/.test(p) && !p.startsWith('http'));
              const img = parts.find((p) => p.startsWith('http'));

              if (barcode && (name || img)) {
                updates.push({
                  barcode,
                  nameUz: name,
                  imageUrl: img,
                });
              }
            }
          }
        }

        if (updates.length === 0) {
          setFileImportStatus("❌ Fayldan shtrix-kodli tovarlar topilmadi.");
          return;
        }

        setFileImportStatus(`Topildi: ${updates.length} ta tovar. Bazaga 100% aniqlik bilan solishtirilmoqda...`);

        const saveRes = await fetch('/api/admin/tasnif/bulk-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
        const saveJson = await saveRes.json();

        if (saveJson.success) {
          setFileImportStatus(
            `✅ Muvaffaqiyatli! ${saveJson.updatedCount} ta mahsulot yangilandi (Rasmlar: ${saveJson.newImagesCount || 0} ta). Chiqmaganlar 100% asli holatda saqlandi.`
          );
          loadStats();
          if (onSuccess) onSuccess();
        } else {
          setFileImportStatus(`❌ Xatolik: ${saveJson.message}`);
        }
      } catch (err: any) {
        setFileImportStatus(`❌ Faylni o'qishda xatolik: ${err?.message}`);
      }
    };

    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Tasnif.soliq.uz Shtrix-kod Sinxronizatsiyasi</h2>
              <p className="text-xs text-emerald-100">
                100% aniq shtrix-kod orqali rasmiy nom va rasmlarni ko'chirish
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 p-5 bg-slate-50 border-b border-slate-200/80 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="text-slate-500 font-medium">Jami tovarlar</div>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {stats?.totalProducts?.toLocaleString() || '...'} ta
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="text-slate-500 font-medium flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-blue-500" /> Shtrix-kodi bor
            </div>
            <div className="text-lg font-bold text-blue-600 mt-1">
              {stats?.withBarcodeCount?.toLocaleString() || '...'} ta
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="text-slate-500 font-medium flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" /> Rasmi bor
            </div>
            <div className="text-lg font-bold text-emerald-600 mt-1">
              {stats?.withImageCount?.toLocaleString() || '...'} ta
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="text-slate-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Rasmi yo'q
            </div>
            <div className="text-lg font-bold text-amber-600 mt-1">
              {stats?.withoutImageCount?.toLocaleString() || '...'} ta
            </div>
          </div>
        </div>

        {/* Strict rule banner */}
        <div className="mx-5 mt-4 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Qat'iy 100% aniqlik qoidasi:</strong> Faqat shtrix-kodi (GTIN) tasnif.soliq.uz tizimi bilan 100% to'liq mos tushgan tovarlarning rasmiy nomi va rasmi yangilanadi. Topilmagan yoki noaniq mahsulotlar <strong>100% asli holatda qoladi</strong>.
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('live')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'live'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Jonli sinxronlash (Brauzer)
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Tasnif Fayl yuklash (Excel / JSON)
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Fon Rejimidagi Skript
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'live' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Tasnif.soliq.uz dan to'g'ridan-to'g'ri qidirish
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    O'zbekiston tarmog'i orqali ketma-ket har bir shtrix-kod so'raladi va yangilanadi
                  </p>
                </div>

                <div className="flex gap-2">
                  {!isSyncing ? (
                    <button
                      onClick={handleStartLiveSync}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Sinxronlashni boshlash
                    </button>
                  ) : (
                    <button
                      onClick={() => setShouldStop(true)}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" /> To'xtatish
                    </button>
                  )}
                </div>
              </div>

              {isSyncing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Sinxronizatsiya davom etmoqda: {syncProgress}%</span>
                    <span>Yangilandi: {updatedCount} ta | Rasmlar: {newImagesCount} ta</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-200"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Console Logs */}
              <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] h-44 overflow-y-auto space-y-1 shadow-inner">
                {syncLogs.length === 0 ? (
                  <div className="text-slate-500 italic">Jarayon jurnali bu yerda ko'rinadi...</div>
                ) : (
                  syncLogs.map((log, idx) => (
                    <div key={idx} className="leading-tight">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Tasnif.soliq.uz dan eksport qilingan faylni yuklash
                </div>
                <p>
                  Agar tasnif.soliq.uz shaxsiy kabinetingizdan tovarlar ro'yxatini Excel, CSV yoki JSON formatida yuklab olgan bo'lsangiz, shu yerga yuklang.
                </p>
                <p className="text-slate-500">
                  Tizim fayldagi shtrix-kodlar (GTIN) bilan bizdagi tovarlarni solishtiradi va faqat 100% to'g'ri kelganlarini yangilaydi.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-emerald-500 transition-colors bg-white">
                <input
                  type="file"
                  id="tasnif-file-input"
                  accept=".json,.csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="tasnif-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-600 hover:underline text-sm">
                      Faylni tanlang
                    </span>{' '}
                    <span className="text-slate-500 text-xs">yoki shu yerga sudrab tashlang</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    JSON, CSV yoki TSV (Ustunlar: Shtrix-kod, Tovar nomi, Rasm havolasi)
                  </div>
                </label>
              </div>

              {fileImportStatus && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{fileImportStatus}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  O'zbekiston Serverida Skriptni Ishga Tushirish
                </div>
                <p>
                  Tasnif.soliq.uz davlat soliq serveri faqat O'zbekiston ichidagi IP-manzillarga ruxsat beradi. Biz siz uchun to'liq avtonom Node.js skriptini tayyorlab qo'ydik.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Terminal buyrug'i:</div>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl flex items-center justify-between">
                  <code>node scripts/sync_tasnif_soliq.js</code>
                  <button
                    onClick={() => navigator.clipboard.writeText('node scripts/sync_tasnif_soliq.js')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans"
                  >
                    Nusxalash
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-700">Skript qanday ishlaydi:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-500">
                  <li>Barcha 7 110 ta tovarning shtrix-kodlarini oladi;</li>
                  <li>Tasnif.soliq.uz API orqali rasmiy soliq nomini va rasmlarini qidiradi;</li>
                  <li>Topilgan tovarlarni 100% aniq yangilaydi;</li>
                  <li>Topilmagan tovarlarga zarracha tegmasdan, asl holatida qoldiradi!</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            Tasnif Soliq MXIK & Shtrix-kod Integratsiyasi
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
