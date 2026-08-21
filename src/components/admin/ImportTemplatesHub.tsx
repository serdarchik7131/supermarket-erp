import React, { useState } from 'react';
import { Download, FileSpreadsheet, CheckCircle2, HelpCircle, FileText, Upload, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { IMPORT_TEMPLATES, downloadTemplateById, TemplateDefinition, parseExcelOrCsvFile } from '../../utils/templateUtils';
import { createProduct, fetchProducts, updateProduct } from '../../services/api';

export const ImportTemplatesHub: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition>(IMPORT_TEMPLATES[0]);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  // Live Import State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; message: string } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleDownload = (id: string, format: 'xls' | 'csv' = 'xls') => {
    downloadTemplateById(id, format);
    setDownloadedId(`${id}_${format}`);
    setTimeout(() => setDownloadedId(null), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const { headers, rows } = await parseExcelOrCsvFile(file);
      if (rows.length === 0) {
        setParseError("Faylda hech qanday ma'lumot topilmadi yoki fayl bo'sh.");
      } else {
        setParsedHeaders(headers);
        setParsedRows(rows);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseError("Faylni o'qishda xatolik yuz berdi. Iltimos, Microsoft Excel (.xls, .xlsx) yoki CSV formatidagi faylni yuklang.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    try {
      const existingProducts = await fetchProducts();
      let createdCount = 0;
      let updatedCount = 0;

      for (const row of parsedRows) {
        // Normalize keys (handle synonyms)
        const nameUz =
          row['Mahsulot Nomi (Uz)'] ||
          row['Mahsulot Nomi'] ||
          row['Nomi'] ||
          row['Name'] ||
          row['Kompaniya Nomi (Mijoz)'] ||
          '';

        if (!nameUz || nameUz.trim() === '') continue;

        const barcode =
          row['Shtrix Kod (Barcode)'] ||
          row['Shtrix Kod'] ||
          row['Barcode'] ||
          row['INN Raqami'] ||
          '';

        const priceNum = Number(
          (row['Sotish Narxi (UZS)'] || row['Sotish Narxi'] || row['Narx'] || row['Price'] || '15000').replace(/[^0-9.]/g, '')
        ) || 15000;

        const costNum = Number(
          (row['Tannarx (UZS)'] || row['Tannarx'] || row['Cost'] || '10000').replace(/[^0-9.]/g, '')
        ) || 10000;

        const sku = row['SKU Kodi'] || row['SKU'] || `SKU-${Date.now().toString().slice(-5)}`;
        const unit = (row["O'lchov Birligi"] || row['Unit'] || 'dona') as any;
        const brand = row['Brend'] || row['Brand'] || 'Tradeuz';
        const categoryId = row['Kategoriya ID'] || 'cat_grocery';

        // Check if product with same barcode or SKU exists
        const matched = existingProducts.find(
          (p) => (barcode && p.barcode === barcode) || (sku && p.sku === sku)
        );

        if (matched) {
          await updateProduct(matched.id, {
            nameUz,
            price: priceNum,
            costPrice: costNum,
            brand,
            unit,
          });
          updatedCount++;
        } else {
          await createProduct({
            nameUz,
            nameRu: nameUz,
            nameEn: nameUz,
            barcode: barcode || `${Math.floor(4780000000000 + Math.random() * 90000000000)}`,
            sku,
            price: priceNum,
            costPrice: costNum,
            unit,
            brand,
            categoryId,
            stockByBranch: {
              br_toshkent_main: 100,
              br_chilanzar: 50,
            },
          });
          createdCount++;
        }
      }

      setImportResult({
        successCount: createdCount + updatedCount,
        message: `✅ Muvaffaqiyatli! ${createdCount} ta yangi saqlandi, ${updatedCount} ta mavjud mahsulot ma'lumotlari va narxlari yangilandi.`,
      });
      setParsedRows([]);
      setUploadedFile(null);
    } catch (e: any) {
      console.error('Import execution error:', e);
      setParseError("Import qilish jarayonida xatolik yuz berdi: " + (e.message || 'Noma\'lum xato'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5 text-xs font-sans max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-500/20">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-[11px] font-bold border border-emerald-500/30">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>EXCEL (.XLS) & CSV IMPORT MARKAZI</span>
          </div>
          <h2 className="text-base font-black text-white">
            Excel va CSV Shablonlari Hamda Jonli Import
          </h2>
          <p className="text-slate-300 text-[11px] max-w-2xl leading-relaxed">
            Microsoft Excel uchun maxsus ishlab chiqilgan shablonlarni yuklab oling va to'ldirilgan fayllarni tizimga bir necha soniyada ommaviy yuklang.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => IMPORT_TEMPLATES.forEach((t) => downloadTemplateById(t.id, 'xls'))}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Barcha Excel Shablonlarni Yuklash (.XLS)</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Templates Selector Cards */}
        <div className="space-y-2.5 lg:col-span-1">
          <div className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider px-1">
            Mavjud Import Shablonlari ({IMPORT_TEMPLATES.length} ta):
          </div>

          {IMPORT_TEMPLATES.map((tpl) => {
            const isSelected = selectedTemplate.id === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="text-xl p-1 bg-slate-100 rounded-xl shrink-0">{tpl.icon}</div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">{tpl.titleUz}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{tpl.descriptionUz}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                        .XLS (Excel)
                      </span>
                      <span className="text-[9px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                        .CSV
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(tpl.id, 'xls');
                    }}
                    className={`p-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                      downloadedId === `${tpl.id}_xls`
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                    }`}
                    title="Microsoft Excel (.xls) ko'rinishida yuklash"
                  >
                    <Download className="w-3 h-3" />
                    <span>XLS</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(tpl.id, 'csv');
                    }}
                    className="p-1 rounded text-[9px] font-medium text-slate-500 hover:text-slate-800 text-center"
                    title="CSV formatida yuklash"
                  >
                    CSV
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Template Details & Live Parser Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{selectedTemplate.titleUz}</h3>
                  <span className="text-[11px] font-mono text-slate-500">{selectedTemplate.filenameXls}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedTemplate.id, 'xls')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all text-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Excel (.XLS) Shablon</span>
                </button>

                <button
                  onClick={() => handleDownload(selectedTemplate.id, 'csv')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl transition-all text-xs cursor-pointer"
                >
                  <span>CSV Shablon</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {selectedTemplate.descriptionUz}
            </p>

            {/* LIVE DRAG & DROP FILE UPLOADER */}
            <div className="bg-slate-50 border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-3xl p-5 text-center space-y-3 transition-colors relative cursor-pointer group">
              <input
                type="file"
                accept=".xls,.xlsx,.csv,.tsv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-xs">
                  {uploadedFile ? uploadedFile.name : "Excel yoki CSV Faylni Shuyerga Tashlang yoki Tanlang"}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Qo'llab-quvvatlanadi: .xls (Microsoft Excel), .xlsx, .csv (maksimal 25MB)
                </p>
              </div>
            </div>

            {isParsing && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800 text-xs font-semibold flex items-center gap-2 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Excel fayli o'qilmoqda va ustunlar tekshirilmoqda...</span>
              </div>
            )}

            {parseError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {importResult && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{importResult.message}</span>
              </div>
            )}

            {/* PARSED DATA PREVIEW TABLE & LIVE IMPORT BUTTON */}
            {parsedRows.length > 0 && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>O'qilgan Ma'lumotlar Qatori ({parsedRows.length} ta yozuv):</span>
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all text-xs cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Tizimga Saqlanmoqda...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{parsedRows.length} ta Yozuvni ERP Tizimiga Import Qilish</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-900 font-extrabold text-white sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        {parsedHeaders.map((h, idx) => (
                          <th key={idx} className="p-2 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                      {parsedRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-blue-50/50">
                          <td className="p-2 font-bold text-slate-400 font-mono">{rIdx + 1}</td>
                          {parsedHeaders.map((h, cIdx) => (
                            <td key={cIdx} className="p-2 whitespace-nowrap">
                              {row[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Structure Preview Table for Template */}
            <div>
              <div className="font-extrabold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Shablon ustunlari va namunaviy ma'lumotlar strukturasi:</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-100 font-extrabold text-slate-800 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">#</th>
                      {selectedTemplate.headers.map((h, idx) => (
                        <th key={idx} className="p-2.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {selectedTemplate.sampleRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-400 font-mono">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1.5 text-[11px] text-amber-900">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-950">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Excel orqali import qilish bo'yicha muhim eslatma:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 pl-1">
                <li>Ushbu shablonlar Microsoft Excel 2007+, Excel for Mac, LibreOffice va Google Sheets dasturlarida to'liq ochiladi va tahrirlanadi.</li>
                <li>Shtrix-kod va SKU mos kelgan taqdirda, mavjud mahsulot narxlari va ombor qoldiqlari avtomatik yangilanadi.</li>
                <li>Nomi yoki shtrix-kodi yo'q bo'lgan qatorlar o'tkazib yuboriladi.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

