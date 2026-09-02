import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Link2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Sliders,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react';
import { Category, Product } from '../../types';
import { parseRegosCSV, parseRegosObject, convertRegosItemToProduct, RegosParsedItem } from '../../utils/regosParser';
import { importRegosBulk, fetchRegosLive } from '../../services/api';
import { ProductThumbnail } from '../common/ProductThumbnail';

interface RegosImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingProducts: Product[];
  onSuccess: () => void;
}

export const RegosImportModal: React.FC<RegosImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingProducts,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'api' | 'paste'>('file');

  // File Upload & Paste States
  const [dragActive, setDragActive] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  // API Connection States
  const [apiUrl, setApiUrl] = useState('https://api.regos.uz/v1/items');
  const [apiToken, setApiToken] = useState('');
  const [apiLogin, setApiLogin] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Parsed Items & Preview
  const [parsedItems, setParsedItems] = useState<RegosParsedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [customMarkupPercent, setCustomMarkupPercent] = useState<number>(0);

  // Import Status
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    total: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setImportResult(null);
    setApiError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'json') {
        const text = await file.text();
        const json = JSON.parse(text);
        const array = Array.isArray(json) ? json : json.items || json.data || json.result || [];
        const items: RegosParsedItem[] = [];
        array.forEach((item: any) => {
          const parsed = parseRegosObject(item, categories);
          if (parsed) items.push(parsed);
        });
        setParsedItems(items);
      } else {
        // CSV or TXT
        const text = await file.text();
        const items = parseRegosCSV(text, categories);
        setParsedItems(items);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setApiError(`Faylni o'qishda xatolik: ${err?.message || 'Format noto\'g\'ri'}`);
    }
  };

  // Handle Raw Text Paste
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setImportResult(null);
    setApiError(null);

    try {
      // Try JSON first
      if (pastedText.trim().startsWith('[') || pastedText.trim().startsWith('{')) {
        const json = JSON.parse(pastedText);
        const array = Array.isArray(json) ? json : json.items || json.data || json.result || [];
        const items: RegosParsedItem[] = [];
        array.forEach((item: any) => {
          const parsed = parseRegosObject(item, categories);
          if (parsed) items.push(parsed);
        });
        setParsedItems(items);
      } else {
        // CSV / TSV
        const items = parseRegosCSV(pastedText, categories);
        setParsedItems(items);
      }
    } catch (err: any) {
      // Fallback CSV
      const items = parseRegosCSV(pastedText, categories);
      setParsedItems(items);
    }
  };

  // Handle Direct Live API Fetch
  const handleFetchFromRegosApi = async () => {
    setIsFetchingApi(true);
    setApiError(null);
    setImportResult(null);

    try {
      const res = await fetchRegosLive({
        apiUrl: apiUrl.trim() || undefined,
        token: apiToken.trim() || undefined,
        login: apiLogin.trim() || undefined,
        password: apiPassword.trim() || undefined,
      });

      if (!res.success) {
        setApiError(res.error || 'Regos API dan ma\'lumot olib bo\'lmadi');
        return;
      }

      const items: RegosParsedItem[] = [];
      (res.items || []).forEach((item: any) => {
        const parsed = parseRegosObject(item, categories);
        if (parsed) items.push(parsed);
      });

      setParsedItems(items);
    } catch (err: any) {
      setApiError(`Regos serveriga ulanishda xatolik: ${err?.message || 'Tarmoq xatosi'}`);
    } finally {
      setIsFetchingApi(false);
    }
  };

  // Apply custom markup on parsed items
  const handleApplyMarkup = (percent: number) => {
    setCustomMarkupPercent(percent);
    if (percent === 0) return;
    const factor = 1 + percent / 100;
    setParsedItems((prev) =>
      prev.map((item) => {
        const baseCost = item.costPrice || item.price;
        const newRetail = Math.round(baseCost * factor);
        const newOptom = Math.round(baseCost * (1 + (percent * 0.5) / 100));
        return {
          ...item,
          price: newRetail,
          wholesalePrice: newOptom,
        };
      })
    );
  };

  // Execute Final Bulk Import
  const handleExecuteImport = async () => {
    if (parsedItems.length === 0) return;
    setIsImporting(true);
    setApiError(null);

    try {
      const productsToImport: Product[] = parsedItems.map((item) =>
        convertRegosItemToProduct(item, existingProducts)
      );

      const res = await importRegosBulk(productsToImport, updateExisting);
      if (res.success) {
        setImportResult({
          added: res.addedCount,
          updated: res.updatedCount,
          total: res.totalProducts,
        });
        onSuccess();
      } else {
        setApiError('Import jarayonida xatolik yuz berdi');
      }
    } catch (err: any) {
      setApiError(`Importda xatolik: ${err?.message || 'Server xatosi'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter items in preview
  const filteredItems = parsedItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.nameUz.toLowerCase().includes(q) ||
      (item.nameRu && item.nameRu.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">REGOS Online Mahsulotlar & Narxlar Importi</h3>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  v3.0 Sync
                </span>
              </div>
              <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                <span>Manba:</span>
                <a
                  href="https://regos.online/uz/business/catalog/items"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white font-mono flex items-center gap-1"
                >
                  regos.online/uz/business/catalog/items
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Regos Faylini Yuklash (.xlsx / .csv / .json)</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Jadval Matnini Qo'yish (Paste text)</span>
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Regos API / Token orqali to'g'ridan-to'g'ri ulash</span>
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all bg-white flex flex-col items-center justify-center gap-2 ${
                dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-slate-800 text-sm block">
                  Regos Online dan eksport qilingan faylni bu yerga tashlang yoki tanlang
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Qo'llab-quvvatlanadigan formatlar: <b>.CSV</b>, <b>.JSON</b>, <b>.TXT</b> (Excel orqali saqlangan)
                </span>
              </div>
              {fileName && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tanlangan fayl: {fileName}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-700 block">
                Regos Online jadvali yoki JSON ma'lumotlarini nusxalab (Ctrl+C) bu yerga qo'ying (Ctrl+V):
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Nomi, Shtrixkod, Narx, Tannarx, Kategoriya..."
                rows={5}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
              ></textarea>
              <div className="flex justify-end">
                <button
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Matndan tovarlarni ajratib olish
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: REGOS LIVE API */}
          {activeTab === 'api' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Regos API Server Manzili:</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.regos.uz/v1/items"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Regos Bearer Token / API Token:
                </label>
                <input
                  type="text"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Bearer eyJhbGciOiJIUzI1NiIs..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Login (agar token bo'lmasa):</label>
                <input
                  type="text"
                  value={apiLogin}
                  onChange={(e) => setApiLogin(e.target.value)}
                  placeholder="ApiLogin yoki Regos Login"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Parol:</label>
                <input
                  type="password"
                  value={apiPassword}
                  onChange={(e) => setApiPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={handleFetchFromRegosApi}
                  disabled={isFetchingApi}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingApi ? 'animate-spin' : ''}`} />
                  <span>{isFetchingApi ? 'Regos dan tovarlar yuklanmoqda...' : 'Regos API dan tovarlarni yuklab olish'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {apiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Success Message */}
          {importResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-extrabold block">Regos tovarlari bazaga muvaffaqiyatli saqlandi!</span>
                  <span className="text-emerald-700 text-[11px]">
                    +{importResult.added} ta yangi tovar qo'shildi, {importResult.updated} ta mavjud tovar narxi yangilandi. Umumiy tovarlar: {importResult.total} ta.
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
              >
                Yopish
              </button>
            </div>
          )}

          {/* PARSED ITEMS PREVIEW TABLE */}
          {parsedItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="font-extrabold text-slate-900 text-xs">
                    Aniqlangan Regos Tovarlari: <b className="text-blue-600">{parsedItems.length} ta</b>
                  </span>
                </div>

                {/* Search in parsed list */}
                <div className="relative w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nomi yoki shtrix-kod..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>

                {/* Batch Markup Multiplier */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-600 font-medium">Ustama foizi:</span>
                  {[0, 15, 25, 30].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handleApplyMarkup(pct)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        customMarkupPercent === pct
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Container */}
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Mahsulot Nomi</th>
                      <th className="p-2">Shtrix-kod</th>
                      <th className="p-2">Tannarx (Prixod)</th>
                      <th className="p-2">Chakana (Roznitsa)</th>
                      <th className="p-2">Ulgurji (Optom)</th>
                      <th className="p-2">Kategoriya</th>
                      <th className="p-2 text-center">Birlik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.slice(0, 100).map((item, idx) => {
                      const isExisting = existingProducts.some(
                        (p) => (item.barcode && p.barcode === item.barcode) || p.nameUz.toLowerCase() === item.nameUz.toLowerCase()
                      );

                      return (
                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-2 text-[10px] text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                <ProductThumbnail product={item as any} iconSize="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{item.nameUz}</span>
                                {isExisting && (
                                  <span className="text-[9px] text-amber-700 bg-amber-50 px-1 rounded font-semibold">
                                    Mavjud (narxi yangilanadi)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-2 font-mono text-[11px] text-slate-600">{item.barcode || '—'}</td>
                          <td className="p-2 font-bold text-slate-700 font-mono">
                            {item.costPrice.toLocaleString()} UZS
                          </td>
                          <td className="p-2 font-bold text-emerald-700 font-mono">
                            {item.price.toLocaleString()} UZS
                          </td>
                          <td className="p-2 font-bold text-indigo-700 font-mono">
                            {(item.wholesalePrice || Math.round(item.costPrice * 1.15)).toLocaleString()} UZS
                          </td>
                          <td className="p-2 text-slate-600 text-[11px] truncate max-w-[120px]">
                            {item.categoryName || item.categoryId || 'Baqqollik'}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-slate-500">
                            {item.unit || 'dona'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Import Options & Action */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Mavjud tovarlar narxlari va ma'lumotlarini yangilash</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setParsedItems([])}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tozalash
                  </button>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
                    <span>
                      {isImporting
                        ? 'Bazaga saqlanmoqda...'
                        : `Barcha ${parsedItems.length} ta tovarlarni bazaga yuklash`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
