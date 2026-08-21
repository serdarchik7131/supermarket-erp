import React, { useState, useEffect } from 'react';
import { printElementById } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';
import {
  ArrowUpRight,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  Building2,
  Trash2,
  X,
  Printer,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, Branch } from '../../types';
import { fetchProducts, fetchBranches, updateProduct } from '../../services/api';
import { notifySyncEvent, subscribeAppDataSync } from '../../utils/syncManager';

interface SpisatItem {
  productId: string;
  productName: string;
  qty: number;
  costPrice: number;
}

interface SpisatDoc {
  id: string;
  docNumber: string;
  date: string;
  branchId: string;
  branchName: string;
  reason: 'muddati_otgan' | 'yaroqsiz_sinish' | 'kamchilik' | 'boshqa';
  reasonText: string;
  items: SpisatItem[];
  totalLossAmount: number;
  note: string;
  status: 'tasdiqlangan' | 'kutilmoqda';
  approvedBy: string;
}

export const SpisatModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock initial write-offs
  const [docs, setDocs] = useState<SpisatDoc[]>([
    {
      id: 'sps_201',
      docNumber: 'SPS-2026-0031',
      date: '2026-08-06 11:20',
      branchId: 'br_chilanzar',
      branchName: 'Chilonzor Filiali',
      reason: 'muddati_otgan',
      reasonText: "Yaroqlilik muddati o'tgan (Srok)",
      items: [
        { productId: 'p5', productName: 'Sut 3.2% Parmalat 1L', qty: 12, costPrice: 12000 },
      ],
      totalLossAmount: 144000,
      note: 'Yaroqlilik muddati tugagan tovarlar utilizatsiya qilindi',
      status: 'tasdiqlangan',
      approvedBy: 'Sardorbek (Super Admin)',
    },
    {
      id: 'sps_202',
      docNumber: 'SPS-2026-0030',
      date: '2026-08-04 16:45',
      branchId: 'br_toshkent_main',
      branchName: 'Toshkent Bosh Ombor',
      reason: 'yaroqsiz_sinish',
      reasonText: 'Transportda sinish va pachoqlanish',
      items: [
        { productId: 'p1', productName: 'Coca-Cola 1.5L Glass Edition', qty: 10, costPrice: 10000 },
      ],
      totalLossAmount: 100000,
      note: 'Ortish jarayonida 1 quti idish yorilgan',
      status: 'tasdiqlangan',
      approvedBy: 'Javohir (Menejer)',
    },
  ]);

  // Form state
  const [selectedBranchId, setSelectedBranchId] = useState('br_toshkent_main');
  const [reason, setReason] = useState<SpisatDoc['reason']>('muddati_otgan');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<SpisatItem[]>([
    { productId: '', productName: '', qty: 1, costPrice: 10000 },
  ]);

  useEffect(() => {
    loadData();
    const savedDocs = localStorage.getItem('tradeuz_spisat_docs');
    if (savedDocs) {
      try {
        setDocs(JSON.parse(savedDocs));
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
      if (pList.length > 0 && items.length === 1 && items[0].productId === '') {
        setItems([{ productId: pList[0].id, productName: pList[0].nameUz, qty: 5, costPrice: pList[0].costPrice }]);
      }
    });
  };

  const handleAddItem = () => {
    if (products.length > 0) {
      setItems((prev) => [
        ...prev,
        { productId: products[0].id, productName: products[0].nameUz, qty: 1, costPrice: products[0].costPrice },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof SpisatItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      if (field === 'productId') {
        const p = products.find((prod) => prod.id === value);
        updated[index].productId = value;
        updated[index].productName = p?.nameUz || '';
        updated[index].costPrice = p?.costPrice || 10000;
      } else {
        (updated[index] as any)[field] = value;
      }
      return updated;
    });
  };

  const totalLoss = items.reduce((sum, item) => sum + item.qty * item.costPrice, 0);

  const getReasonLabel = (r: SpisatDoc['reason']) => {
    switch (r) {
      case 'muddati_otgan':
        return "⏳ Muddati o'tgan (Srok)";
      case 'yaroqsiz_sinish':
        return '💥 Sinish & Yaroqsiz holat';
      case 'kamchilik':
        return '🔍 Kamchilik (Defisit)';
      default:
        return '📋 Boshqa texnik sabab';
    }
  };

  const handleCreateSpisaniye = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch = branches.find((b) => b.id === selectedBranchId);
    const newDoc: SpisatDoc = {
      id: `sps_${Date.now()}`,
      docNumber: `SPS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      branchId: selectedBranchId,
      branchName: targetBranch?.name || 'Toshkent Bosh Ombor',
      reason,
      reasonText: getReasonLabel(reason),
      items,
      totalLossAmount: totalLoss,
      note: note || 'Hisobdan chiqarish rasmiylashtirildi',
      status: 'tasdiqlangan',
      approvedBy: 'Sardorbek (Bosh Operator)',
    };

    // Deduct stock levels for selected branch in API
    for (const it of items) {
      const prod = products.find((p) => p.id === it.productId);
      if (prod) {
        const currentStock = Number(prod.stockByBranch?.[selectedBranchId as keyof typeof prod.stockByBranch] || 0);
        const newStock = Math.max(0, currentStock - Number(it.qty));
        const updatedBranchStock = { ...(prod.stockByBranch || {}), [selectedBranchId]: newStock };
        await updateProduct(prod.id, {
          stockByBranch: updatedBranchStock,
        });
      }
    }

    const updatedDocs = [newDoc, ...docs];
    setDocs(updatedDocs);
    try {
      localStorage.setItem('tradeuz_spisat_docs', JSON.stringify(updatedDocs));
    } catch (e) {
      console.error(e);
    }

    notifySyncEvent();
    setIsModalOpen(false);
    setNote('');
  };

  // Selected doc for viewing details / print
  const [viewDoc, setViewDoc] = useState<SpisatDoc | null>(null);

  const filteredDocs = docs.filter(
    (d) =>
      d.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.reasonText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportExcelCSV = () => {
    exportToExcel({
      filename: `spisaniye_hujjatlari_${Date.now()}`,
      title: 'TRADEUZ SFA — Spisaniye / Yaroqsiz Hujjatlari Hisoboti',
      subtitle: `Jami spisaniye hujjatlari: ${filteredDocs.length} ta`,
      columns: [
        { header: '№ Hujjat', key: 'docNumber', align: 'center' },
        { header: 'Sana va Vaqt', key: 'date', align: 'center' },
        { header: 'Ombor / Filial', key: 'branchName', align: 'left' },
        { header: 'Spisaniye Sababi', key: 'reasonText', align: 'left' },
        { header: 'Pozitsiyalar', key: 'itemsCount', align: 'center' },
        { header: 'Zarar Summasi (UZS)', key: 'totalLossAmount', align: 'right' },
        { header: 'Izoh / Sabab', key: 'note', align: 'left' },
        { header: 'Status', key: 'status', align: 'center' },
      ],
      data: filteredDocs.map((d) => ({
        docNumber: d.docNumber,
        date: d.date,
        branchName: d.branchName,
        reasonText: d.reasonText,
        itemsCount: `${d.items.length} turdagi`,
        totalLossAmount: d.totalLossAmount.toLocaleString('uz-UZ'),
        note: d.note || '-',
        status: d.status === 'approved' ? 'Tasdiqlangan' : 'Bajarilgan',
      })),
      summary: {
        reasonText: 'JAMI ZARAR SUMMASI:',
        totalLossAmount: filteredDocs.reduce((sum, d) => sum + d.totalLossAmount, 0).toLocaleString('uz-UZ') + ' UZS',
      },
    });
  };

  return (
    <div className="space-y-2 text-xs font-sans">
      {/* Linko ERP Header Banner */}
      <div className="bg-[#1c2237] text-white p-3.5 rounded-xl border border-slate-700/80 shadow-md mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shrink-0 shadow-inner">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded">
                Linko ERP Sklad
              </span>
              <h2 className="text-sm font-extrabold text-white">
                Spisat (Hisobdan Chiqarish)
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Buzilgan, muddati o'tgan yoki brak tovarlarni ombor qoldig'idan chiqarish
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-lg text-left">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Jami Hujjatlar</span>
            <span className="text-xs font-black text-rose-400 font-mono">{filteredDocs.length} ta</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-lg text-left">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Jami Zarar Summasi</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              {filteredDocs.reduce((sum, d) => sum + d.totalLossAmount, 0).toLocaleString('ru-RU')} UZS
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
              placeholder="Hujjat №, Sabab yoki Ombor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] focus:outline-none focus:border-rose-500 font-medium shadow-inner"
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
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yangi Spisaniye Yaratish</span>
          </button>
        </div>
      </div>

      {/* Spisat Table */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto custom-scrollbar shadow-xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#1c2237] text-slate-100 font-bold uppercase text-[10px] tracking-wider border-b border-indigo-900">
            <tr>
              <th className="p-2 border-r border-indigo-900/50 font-mono">Hujjat №</th>
              <th className="p-2 border-r border-indigo-900/50">Sana</th>
              <th className="p-2 border-r border-indigo-900/50">Ombor / Filial</th>
              <th className="p-2 border-r border-indigo-900/50">Chiqarish Sababi</th>
              <th className="p-2 border-r border-indigo-900/50">Mahsulot Pozitsiyalari</th>
              <th className="p-2 border-r border-indigo-900/50 text-right">Zarar Summasi</th>
              <th className="p-2 border-r border-indigo-900/50 text-center">Status</th>
              <th className="p-2 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
            {filteredDocs.map((doc) => {
              const totalItemsQty = doc.items.reduce((acc, curr) => acc + curr.qty, 0);
              return (
                <tr key={doc.id} className="hover:bg-blue-50/70 transition-colors cursor-pointer even:bg-slate-50/50" onClick={() => setViewDoc(doc)}>
                  <td className="p-2 border-r border-slate-200 font-mono font-extrabold text-rose-600">
                    {doc.docNumber}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-600 font-mono text-[10px] whitespace-nowrap">
                    {doc.date}
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-bold text-[10px]">
                      🏢 {doc.branchName}
                    </span>
                  </td>
                  <td className="p-2 border-r border-slate-200 font-bold text-amber-800">
                    {doc.reasonText}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-800">
                    <span className="font-extrabold text-slate-900">{doc.items.length}</span> turdagi ({totalItemsQty} dona)
                  </td>
                  <td className="p-2 border-r border-slate-200 font-black text-rose-700 text-right font-mono text-xs whitespace-nowrap">
                    {doc.totalLossAmount.toLocaleString('ru-RU')} UZS
                  </td>
                  <td className="p-2 border-r border-slate-200 text-center">
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Tasdiqlangan</span>
                    </span>
                  </td>
                  <td className="p-2 text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setViewDoc(doc)}
                      className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      title="Ichki ma'lumotlarni ko'rish"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setViewDoc(doc);
                        setTimeout(() => printElementById('printable-spisat', `Spisaniye_${doc.docNumber}`), 200);
                      }}
                      className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                      title="Chop etish"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal New Write-off */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Yangi Hisobdan Chiqarish (Spisaniye)</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSpisaniye} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Qaysi Ombor/Filialdan chiqarilmoqda:</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Hisobdan Chiqarish Sababi:</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700 font-bold text-amber-300"
                  >
                    <option value="muddati_otgan">⏳ Yaroqlilik muddati o'tgan (Srok)</option>
                    <option value="yaroqsiz_sinish">💥 Sinish, pachoqlanish, yaroqsizlik</option>
                    <option value="kamchilik">🔍 Ombor inventarizatsiya kamchiligi</option>
                    <option value="boshqa">📋 Boshqa texnik sabab</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Chiqariladigan Tovar Listi:</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tovar Qo'shish</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="flex-1 bg-slate-900 text-slate-100 p-2 rounded-lg border border-slate-700 text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nameUz} ({p.sku})
                          </option>
                        ))}
                      </select>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Middat/Soni"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                          className="w-full bg-slate-900 text-slate-100 p-2 rounded-lg border border-slate-700 text-center text-xs"
                        />
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          placeholder="Tan narxi"
                          value={item.costPrice}
                          onChange={(e) => handleItemChange(idx, 'costPrice', Number(e.target.value))}
                          className="w-full bg-slate-900 text-slate-100 p-2 rounded-lg border border-slate-700 text-right text-xs"
                        />
                      </div>

                      <div className="w-28 text-right font-bold text-rose-400 text-xs">
                        {(item.qty * item.costPrice).toLocaleString()}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Qo'shimcha Izoh / Akt bayonoti:</label>
                <input
                  type="text"
                  placeholder="Masalan: Maxsus komissiya tomonidan dalolatnoma tuzildi"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
                />
              </div>

              {/* Total Loss */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Jami Zarar (Tan narxi bo'yicha):</span>
                <span className="text-base font-black text-rose-400">
                  {totalLoss.toLocaleString()} UZS
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg"
                >
                  Hisobdan Chiqarish va Qoldiqni Kamaytirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: VIEW SPISANIYE DETAILS & PRINT */}
      {viewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div id="printable-spisat" className="bg-white border border-slate-300 rounded-2xl p-5 max-w-2xl w-full space-y-4 shadow-2xl font-sans text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Hisobdan Chiqarish Akta (Spisaniye)</span>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Hujjat № {viewDoc.docNumber}</span>
                  <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Tasdiqlangan
                  </span>
                </h3>
              </div>
              <button onClick={() => setViewDoc(null)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block">Sana va Vaqt:</span>
                <strong className="text-slate-900">{viewDoc.date}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Ombor / Filial:</span>
                <strong className="text-slate-900">{viewDoc.branchName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Chiqarish Sababi:</span>
                <strong className="text-rose-700">{viewDoc.reasonText}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tasdiqladi:</span>
                <strong className="text-slate-900">{viewDoc.approvedBy}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 block">Izoh / Bayonot:</span>
                <strong className="text-slate-800">{viewDoc.note}</strong>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#24275f] text-white font-semibold">
                  <tr>
                    <th className="p-2 border-r border-indigo-900">№</th>
                    <th className="p-2 border-r border-indigo-900">Mahsulot Nomi</th>
                    <th className="p-2 border-r border-indigo-900 text-center">Chiqarilgan Soni</th>
                    <th className="p-2 border-r border-indigo-900 text-right">Tan Narxi</th>
                    <th className="p-2 text-right">Zarar Summasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewDoc.items.map((item, index) => (
                    <tr key={index} className="even:bg-slate-50 font-medium text-slate-800">
                      <td className="p-2 border-r border-slate-200 text-center text-slate-400">{index + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{item.productName}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-700">{item.qty} dona</td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">{item.costPrice.toLocaleString('ru-RU')} SUM</td>
                      <td className="p-2 text-right font-black font-mono text-rose-700">{(item.qty * item.costPrice).toLocaleString('ru-RU')} SUM</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="font-bold text-rose-950">Jami Zarar Summasi:</span>
              <span className="font-black text-sm text-rose-900 font-mono">
                {viewDoc.totalLossAmount.toLocaleString('ru-RU')} SUM
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => printElementById('printable-spisat', `Spisaniye_${viewDoc.docNumber}`)}
                className="bg-[#24275f] hover:bg-indigo-900 text-white font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Chop etish (Pechat)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewDoc(null)}
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
