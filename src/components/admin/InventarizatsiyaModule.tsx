import React, { useState, useEffect } from 'react';
import { printElementById } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  X,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, Branch } from '../../types';
import { fetchProducts, fetchBranches, updateProduct } from '../../services/api';
import { notifySyncEvent, subscribeAppDataSync } from '../../utils/syncManager';

interface AuditProductRow {
  product: Product;
  systemQty: number;
  actualQty: number;
}

interface AuditSession {
  id: string;
  auditNumber: string;
  date: string;
  branchId: string;
  branchName: string;
  auditorName: string;
  totalProductsCount: number;
  discrepancyCount: number;
  totalDiffAmount: number; // positive = surplus, negative = deficit
  status: 'yakunlangan' | 'davom_etmoqda';
}

export const InventarizatsiyaModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active Audit Form state
  const [selectedBranchId, setSelectedBranchId] = useState('br_toshkent_main');
  const [auditorName, setAuditorName] = useState('Sardorbek (Bosh Tekshiruvchi)');
  const [auditRows, setAuditRows] = useState<AuditProductRow[]>([]);

  // History sessions
  const [sessions, setSessions] = useState<AuditSession[]>([
    {
      id: 'inv_301',
      auditNumber: 'INV-2026-0012',
      date: '2026-08-01 18:00',
      branchId: 'br_toshkent_main',
      branchName: 'Toshkent Bosh Ombor',
      auditorName: 'Sardorbek & Komissiya',
      totalProductsCount: 8,
      discrepancyCount: 1,
      totalDiffAmount: -24000,
      status: 'yakunlangan',
    },
    {
      id: 'inv_302',
      auditNumber: 'INV-2026-0011',
      date: '2026-07-25 20:30',
      branchId: 'br_chilanzar',
      branchName: 'Chilonzor Filiali',
      auditorName: 'Javohir (Menejer)',
      totalProductsCount: 8,
      discrepancyCount: 0,
      totalDiffAmount: 0,
      status: 'yakunlangan',
    },
  ]);

  useEffect(() => {
    loadData();
    const savedSessions = localStorage.getItem('tradeuz_inventarizatsiya_sessions');
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error(e);
      }
    }
    const unsub = subscribeAppDataSync(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const loadData = () => {
    Promise.all([fetchProducts(), fetchBranches()]).then(([pList, bList]) => {
      setProducts(pList);
      setBranches(bList);
    });
  };

  const handleStartNewAudit = () => {
    const branchKey = selectedBranchId as keyof Product['stockByBranch'];
    const rows: AuditProductRow[] = products.map((p) => {
      const sysQty = p.stockByBranch[branchKey] || 0;
      return {
        product: p,
        systemQty: sysQty,
        actualQty: sysQty, // default to system qty
      };
    });
    setAuditRows(rows);
    setIsModalOpen(true);
  };

  const handleBranchChangeInAudit = (bId: string) => {
    setSelectedBranchId(bId);
    const branchKey = bId as keyof Product['stockByBranch'];
    setAuditRows((prev) =>
      prev.map((row) => {
        const sysQty = row.product.stockByBranch[branchKey] || 0;
        return {
          ...row,
          systemQty: sysQty,
          actualQty: sysQty,
        };
      })
    );
  };

  const handleActualQtyChange = (productId: string, val: number) => {
    setAuditRows((prev) =>
      prev.map((row) => (row.product.id === productId ? { ...row, actualQty: val } : row))
    );
  };

  const calculateAuditStats = () => {
    let discrepancyCount = 0;
    let totalDiffAmount = 0;

    auditRows.forEach((row) => {
      const diff = row.actualQty - row.systemQty;
      if (diff !== 0) {
        discrepancyCount += 1;
        totalDiffAmount += diff * row.product.costPrice;
      }
    });

    return { discrepancyCount, totalDiffAmount };
  };

  const handleFinishAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = branches.find((b) => b.id === selectedBranchId);
    const { discrepancyCount, totalDiffAmount } = calculateAuditStats();

    const newSession: AuditSession = {
      id: `inv_${Date.now()}`,
      auditNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      branchId: selectedBranchId,
      branchName: branch?.name || 'Ombor',
      auditorName,
      totalProductsCount: auditRows.length,
      discrepancyCount,
      totalDiffAmount,
      status: 'yakunlangan',
    };

    // Update system stock in API for each audited row
    for (const row of auditRows) {
      if (row.actualQty !== row.systemQty) {
        const prod = products.find((p) => p.id === row.product.id);
        if (prod) {
          const updatedBranchStock = { ...(prod.stockByBranch || {}), [selectedBranchId]: Math.max(0, Number(row.actualQty)) };
          await updateProduct(prod.id, {
            stockByBranch: updatedBranchStock,
          });
        }
      }
    }

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    try {
      localStorage.setItem('tradeuz_inventarizatsiya_sessions', JSON.stringify(updatedSessions));
    } catch (e) {
      console.error(e);
    }

    notifySyncEvent();
    setIsModalOpen(false);
  };

  // Selected audit session for viewing details / print
  const [viewSession, setViewSession] = useState<AuditSession | null>(null);

  const filteredSessions = sessions.filter(
    (s) =>
      s.auditNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.auditorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportExcelCSV = () => {
    exportToExcel({
      filename: `inventarizatsiya_aktlari_${Date.now()}`,
      title: 'TRADEUZ SFA — Inventarizatsiya va Qoldiqlar Auditi Hisoboti',
      subtitle: `Jami audit sessiyalari: ${filteredSessions.length} ta`,
      columns: [
        { header: '№ Audit', key: 'auditNumber', align: 'center' },
        { header: 'Sana va Vaqt', key: 'date', align: 'center' },
        { header: 'Ombor / Filial', key: 'branchName', align: 'left' },
        { header: 'Auditor / Mas\'ul', key: 'auditorName', align: 'left' },
        { header: 'Tekshirilgan', key: 'totalProductsCount', align: 'center' },
        { header: 'Farqlar Soni', key: 'discrepancyCount', align: 'center' },
        { header: 'Farq Summasi (UZS)', key: 'totalDiffAmount', align: 'right' },
        { header: 'Status', key: 'status', align: 'center' },
      ],
      data: filteredSessions.map((s) => ({
        auditNumber: s.auditNumber,
        date: s.date,
        branchName: s.branchName,
        auditorName: s.auditorName,
        totalProductsCount: `${s.totalProductsCount} tovar`,
        discrepancyCount: `${s.discrepancyCount} ta farq`,
        totalDiffAmount: s.totalDiffAmount.toLocaleString('uz-UZ'),
        status: s.status === 'completed' ? 'Yopilgan' : 'Jarayonda',
      })),
      summary: {
        auditorName: 'JAMI FARQ SUMMASI:',
        totalDiffAmount: filteredSessions.reduce((sum, s) => sum + s.totalDiffAmount, 0).toLocaleString('uz-UZ') + ' UZS',
      },
    });
  };

  return (
    <div className="space-y-2 text-xs font-sans">
      {/* Linko ERP Header Banner */}
      <div className="bg-[#1c2237] text-white p-3.5 rounded-xl border border-slate-700/80 shadow-md mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold shrink-0 shadow-inner">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded">
                Linko ERP Sklad
              </span>
              <h2 className="text-sm font-extrabold text-white">
                Inventarizatsiya (Sklad Audit)
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Ombordagi amaldagi tovarlarni hisob-kitob qilish va tizim qoldiqlariga tenglashtirish
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-lg text-left">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Jami Auditlar</span>
            <span className="text-xs font-black text-blue-400 font-mono">{filteredSessions.length} ta</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-lg text-left">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Farq Summasi</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              {filteredSessions.reduce((sum, s) => sum + s.totalDiffAmount, 0).toLocaleString('ru-RU')} UZS
            </span>
          </div>
        </div>
      </div>

      {/* Top Filter & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs mb-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Audit №, Ombor yoki Auditor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] focus:outline-none focus:border-blue-500 font-medium shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportExcelCSV}
            className="bg-[#22c55e] hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 shadow-2xs transition-all"
            title="Excel formatida saqlash"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={handleStartNewAudit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yangi Inventarizatsiya</span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto custom-scrollbar shadow-xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#1c2237] text-slate-100 font-bold uppercase text-[10px] tracking-wider border-b border-indigo-900">
            <tr>
              <th className="p-2 border-r border-indigo-900/50 font-mono">Audit №</th>
              <th className="p-2 border-r border-indigo-900/50">Sana</th>
              <th className="p-2 border-r border-indigo-900/50">Ombor / Filial</th>
              <th className="p-2 border-r border-indigo-900/50">Mas'ul Auditor</th>
              <th className="p-2 border-r border-indigo-900/50">Tekshirilgan Tovar</th>
              <th className="p-2 border-r border-indigo-900/50">Taqovut (Kam/Ortiq)</th>
              <th className="p-2 border-r border-indigo-900/50 text-center">Status</th>
              <th className="p-2 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
            {filteredSessions.map((s) => (
              <tr key={s.id} className="hover:bg-blue-50/70 transition-colors cursor-pointer even:bg-slate-50/50" onClick={() => setViewSession(s)}>
                <td className="p-2 border-r border-slate-200 font-mono font-extrabold text-blue-700">
                  {s.auditNumber}
                </td>
                <td className="p-2 border-r border-slate-200 text-slate-600 font-mono text-[10px] whitespace-nowrap">
                  {s.date}
                </td>
                <td className="p-2 border-r border-slate-200">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-bold text-[10px]">
                    🏢 {s.branchName}
                  </span>
                </td>
                <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                  {s.auditorName}
                </td>
                <td className="p-2 border-r border-slate-200 text-slate-800">
                  <span className="font-extrabold text-slate-900">{s.totalProductsCount}</span> ta nomdagi
                </td>
                <td className="p-2 border-r border-slate-200">
                  {s.discrepancyCount === 0 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Farq Yo'q (Mos)</span>
                    </span>
                  ) : (
                    <span className={`font-bold ${s.totalDiffAmount < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                      {s.discrepancyCount} ta tovarda farq ({s.totalDiffAmount.toLocaleString('ru-RU')} UZS)
                    </span>
                  )}
                </td>
                <td className="p-2 border-r border-slate-200 text-center">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                    Yakunlangan
                  </span>
                </td>
                <td className="p-2 text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewSession(s)}
                    className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    title="Audit tafsilotlarini ko'rish"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setViewSession(s);
                      setTimeout(() => printElementById('printable-inventar', `Audit_${s.auditNumber}`), 200);
                    }}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
                    title="Chop etish"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Interactive Audit Session */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-sky-400" />
                  <span>Jonli Inventarizatsiya Boshlash & Sanash</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Haqiqiy sanalgan miqdorni kiriting — tizim avtomatik farqni hisoblaydi
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinishAudit} className="flex-1 flex flex-col space-y-4 overflow-hidden text-xs">
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="text-slate-400 block mb-1">Tekshiriladigan Ombor / Filial:</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => handleBranchChangeInAudit(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700 font-bold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Audit Mas'uli (Auditor):</label>
                  <input
                    type="text"
                    required
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              {/* Audit Table */}
              <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">Mahsulot</th>
                      <th className="p-3">Tizimdagi Qoldiq</th>
                      <th className="p-3">Sanalgan (Amaldagi)</th>
                      <th className="p-3">Farq (Soni)</th>
                      <th className="p-3 text-right">Summa Farqi (UZS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditRows.map((row) => {
                      const diff = row.actualQty - row.systemQty;
                      const diffVal = diff * row.product.costPrice;

                      return (
                        <tr key={row.product.id} className="hover:bg-slate-900/60">
                          <td className="p-3">
                            <div className="font-bold text-slate-100">{row.product.nameUz}</div>
                            <div className="text-[10px] text-slate-500 font-mono">SKU: {row.product.sku}</div>
                          </td>

                          <td className="p-3 font-mono font-bold text-slate-300">
                            {row.systemQty} {row.product.unit}
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              value={row.actualQty}
                              onChange={(e) => handleActualQtyChange(row.product.id, Number(e.target.value))}
                              className="w-24 bg-slate-900 text-white font-bold p-1.5 rounded-lg border border-sky-500/50 text-center text-xs focus:outline-none focus:border-sky-400"
                            />
                          </td>

                          <td className="p-3 font-mono font-bold">
                            {diff === 0 ? (
                              <span className="text-slate-500">0</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-400">+{diff} (Ortiqcha)</span>
                            ) : (
                              <span className="text-rose-400">{diff} (Kam)</span>
                            )}
                          </td>

                          <td className="p-3 text-right font-mono font-bold">
                            {diffVal === 0 ? (
                              <span className="text-slate-500">0 UZS</span>
                            ) : diffVal > 0 ? (
                              <span className="text-emerald-400">+{diffVal.toLocaleString()} UZS</span>
                            ) : (
                              <span className="text-rose-400">{diffVal.toLocaleString()} UZS</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Audit Summary Footer */}
              {(() => {
                const { discrepancyCount, totalDiffAmount } = calculateAuditStats();
                return (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">Farqli tovarlar: <strong className="text-white">{discrepancyCount} ta</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Jami Farq Summasi:</span>
                      <span className={`text-base font-black ${totalDiffAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalDiffAmount >= 0 ? `+${totalDiffAmount.toLocaleString()}` : totalDiffAmount.toLocaleString()} UZS
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Inventarizatsiyani Tasdiqlash & Sinxronlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: VIEW INVENTARIZATSIYA DETAILS & PRINT */}
      {viewSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div id="printable-inventar" className="bg-white border border-slate-300 rounded-2xl p-5 max-w-2xl w-full space-y-4 shadow-2xl font-sans text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wide">Inventarizatsiya Hujjati (Audit Dalolatnomasi)</span>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Audit № {viewSession.auditNumber}</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Yakunlangan
                  </span>
                </h3>
              </div>
              <button onClick={() => setViewSession(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block">Sana va Vaqt:</span>
                <strong className="text-slate-900">{viewSession.date}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Ombor / Filial:</span>
                <strong className="text-slate-900">{viewSession.branchName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Mas'ul Auditor:</span>
                <strong className="text-slate-900">{viewSession.auditorName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tekshirilgan Tovarlar:</span>
                <strong className="text-slate-900">{viewSession.totalProductsCount} nomda</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Taqovut Bor Tovarlar:</span>
                <strong className={viewSession.discrepancyCount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {viewSession.discrepancyCount} ta
                </strong>
              </div>
            </div>

            {/* Difference Summary Box */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${viewSession.totalDiffAmount < 0 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-emerald-50 border-emerald-200 text-emerald-950'}`}>
              <span className="font-bold">Natijaviy Farq Summasi:</span>
              <span className="font-black text-sm font-mono">
                {viewSession.totalDiffAmount >= 0 ? `+${viewSession.totalDiffAmount.toLocaleString('ru-RU')}` : viewSession.totalDiffAmount.toLocaleString('ru-RU')} SUM
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => printElementById('printable-inventar', `Audit_${viewSession.auditNumber}`)}
                className="bg-[#24275f] hover:bg-indigo-900 text-white font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Chop etish (Pechat)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewSession(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-1.5 rounded-lg transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
