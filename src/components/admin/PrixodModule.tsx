import React, { useState, useEffect } from 'react';
import { printElementById } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';
import {
  ArrowDownLeft,
  Plus,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Building2,
  Package,
  Calendar,
  X,
  Printer,
  DollarSign,
  Truck,
} from 'lucide-react';
import { Product, Branch } from '../../types';
import { fetchProducts, fetchBranches, updateProduct } from '../../services/api';
import { notifySyncEvent, subscribeAppDataSync } from '../../utils/syncManager';

interface PrixodItem {
  productId: string;
  productName: string;
  qty: number;
  costPrice: number;
}

interface PrixodDoc {
  id: string;
  docNumber: string;
  date: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  items: PrixodItem[];
  totalAmount: number;
  status: 'qabul_qilingan' | 'kutilmoqda' | 'bekor_qilingan';
  createdBy: string;
}

export const PrixodModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock initial prikhod documents
  const [docs, setDocs] = useState<PrixodDoc[]>([
    {
      id: 'prx_101',
      docNumber: 'PRX-2026-0091',
      date: '2026-08-06 14:30',
      supplierName: 'Coca-Cola Bottlers Tashkent',
      branchId: 'br_toshkent_main',
      branchName: 'Toshkent Bosh Ombor',
      items: [
        { productId: 'p1', productName: 'Coca-Cola 1.5L Classic', qty: 200, costPrice: 9500 },
        { productId: 'p2', productName: 'Fanta Orange 1.5L', qty: 100, costPrice: 9500 },
      ],
      totalAmount: 2850000,
      status: 'qabul_qilingan',
      createdBy: 'Sardorbek (Omborchi)',
    },
    {
      id: 'prx_102',
      docNumber: 'PRX-2026-0090',
      date: '2026-08-05 09:15',
      supplierName: 'Nestle Food Uzbekistan',
      branchId: 'br_chilanzar',
      branchName: 'Chilonzor Filiali',
      items: [
        { productId: 'p3', productName: 'Nescafe Gold 190g', qty: 50, costPrice: 42000 },
      ],
      totalAmount: 2100000,
      status: 'qabul_qilingan',
      createdBy: 'Javohir (Menejer)',
    },
  ]);

  // Form State for new Prikhod
  const [supplierName, setSupplierName] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('br_toshkent_main');
  const [items, setItems] = useState<PrixodItem[]>([
    { productId: '', productName: '', qty: 10, costPrice: 10000 },
  ]);

  useEffect(() => {
    loadData();
    const savedDocs = localStorage.getItem('tradeuz_prixod_docs');
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
        setItems([{ productId: pList[0].id, productName: pList[0].nameUz, qty: 50, costPrice: pList[0].costPrice }]);
      }
    });
  };

  const handleAddItem = () => {
    if (products.length > 0) {
      setItems((prev) => [
        ...prev,
        { productId: products[0].id, productName: products[0].nameUz, qty: 10, costPrice: products[0].costPrice },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrixodItem, value: any) => {
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

  const totalInvoiceAmount = items.reduce((sum, item) => sum + item.qty * item.costPrice, 0);

  const handleCreatePrixod = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch = branches.find((b) => b.id === selectedBranchId);
    const newDoc: PrixodDoc = {
      id: `prx_${Date.now()}`,
      docNumber: `PRX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      supplierName: supplierName || 'Respublika Ulgurji Baza',
      branchId: selectedBranchId,
      branchName: targetBranch?.name || 'Toshkent Bosh Ombor',
      items,
      totalAmount: totalInvoiceAmount,
      status: 'qabul_qilingan',
      createdBy: 'Sardorbek (Bosh Operator)',
    };

    // Update actual stock levels for selected branch in API
    for (const it of items) {
      const prod = products.find((p) => p.id === it.productId);
      if (prod) {
        const currentStock = Number(prod.stockByBranch?.[selectedBranchId as keyof typeof prod.stockByBranch] || 0);
        const newStock = currentStock + Number(it.qty);
        const updatedBranchStock = { ...(prod.stockByBranch || {}), [selectedBranchId]: newStock };
        await updateProduct(prod.id, {
          stockByBranch: updatedBranchStock,
          costPrice: it.costPrice > 0 ? Number(it.costPrice) : prod.costPrice,
        });
      }
    }

    const updatedDocs = [newDoc, ...docs];
    setDocs(updatedDocs);
    try {
      localStorage.setItem('tradeuz_prixod_docs', JSON.stringify(updatedDocs));
    } catch (e) {
      console.error(e);
    }

    notifySyncEvent();
    setIsModalOpen(false);
    setSupplierName('');
  };

  // Selected doc for viewing details / print
  const [viewDoc, setViewDoc] = useState<PrixodDoc | null>(null);

  const filteredDocs = docs.filter(
    (d) =>
      d.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.branchName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportExcelCSV = () => {
    exportToExcel({
      filename: `prixod_hujjatlari_${Date.now()}`,
      title: 'TRADEUZ SFA — Kirim Hujjatlari Hisoboti (Prixod)',
      subtitle: `Jami kirim hujjatlari: ${filteredDocs.length} ta`,
      columns: [
        { header: '№ Hujjat', key: 'docNumber', align: 'center' },
        { header: 'Sana va Vaqt', key: 'date', align: 'center' },
        { header: 'Yetkazib Beruvchi', key: 'supplierName', align: 'left' },
        { header: 'Qabul Qiluvchi Ombor', key: 'branchName', align: 'left' },
        { header: 'Pozitsiyalar', key: 'itemsCount', align: 'center' },
        { header: 'Jami Summa (UZS)', key: 'totalAmount', align: 'right' },
        { header: 'Status', key: 'status', align: 'center' },
      ],
      data: filteredDocs.map((d) => ({
        docNumber: d.docNumber,
        date: d.date,
        supplierName: d.supplierName,
        branchName: d.branchName,
        itemsCount: `${d.items.length} turdagi`,
        totalAmount: d.totalAmount.toLocaleString('uz-UZ'),
        status: d.status === 'approved' ? 'Tasdiqlangan' : 'Qabul qilingan',
      })),
      summary: {
        supplierName: 'JAMI KIRIM SUMMASI:',
        totalAmount: filteredDocs.reduce((sum, d) => sum + d.totalAmount, 0).toLocaleString('uz-UZ') + ' UZS',
      },
    });
  };

  return (
    <div className="space-y-2 text-xs font-sans">
      {/* Linko ERP Header Banner */}
      <div className="bg-[#1c2237] text-white p-3.5 rounded-xl border border-slate-700/80 shadow-md mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-inner">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded">
                Linko ERP Sklad
              </span>
              <h2 className="text-sm font-extrabold text-white">
                Prixod (Kirim Hujjatlari)
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Yetkazib beruvchilardan tovar qabul qilish va omborlar qoldig'iga kiritish
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-lg text-left">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Jami Hujjatlar</span>
            <span className="text-xs font-black text-emerald-400 font-mono">{filteredDocs.length} ta</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-lg text-left">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Jami Kirim Summasi</span>
            <span className="text-xs font-black text-white font-mono">
              {filteredDocs.reduce((sum, d) => sum + d.totalAmount, 0).toLocaleString('ru-RU')} UZS
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
              placeholder="Hujjat №, Yetkazib beruvchi yoki Ombor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] focus:outline-none focus:border-emerald-500 font-medium shadow-inner"
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yangi Prixod Yaratish</span>
          </button>
        </div>
      </div>

      {/* Prixod Invoices Table */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto custom-scrollbar shadow-xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#1c2237] text-slate-100 font-bold uppercase text-[10px] tracking-wider border-b border-indigo-900">
            <tr>
              <th className="p-2 border-r border-indigo-900/50 font-mono">Hujjat №</th>
              <th className="p-2 border-r border-indigo-900/50">Sana</th>
              <th className="p-2 border-r border-indigo-900/50">Yetkazib Beruvchi (Mijoz)</th>
              <th className="p-2 border-r border-indigo-900/50">Qabul Qilingan Ombor</th>
              <th className="p-2 border-r border-indigo-900/50">Mahsulot Pozitsiyalari</th>
              <th className="p-2 border-r border-indigo-900/50 text-right">Jami Summa</th>
              <th className="p-2 border-r border-indigo-900/50 text-center">Status</th>
              <th className="p-2 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
            {filteredDocs.map((doc) => {
              const totalItemsQty = doc.items.reduce((acc, curr) => acc + curr.qty, 0);
              return (
                <tr key={doc.id} className="hover:bg-blue-50/70 transition-colors cursor-pointer even:bg-slate-50/50" onClick={() => setViewDoc(doc)}>
                  <td className="p-2 border-r border-slate-200 font-mono font-extrabold text-blue-700">
                    {doc.docNumber}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-600 font-mono text-[10px] whitespace-nowrap">
                    {doc.date}
                  </td>
                  <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{doc.supplierName}</span>
                    </div>
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-bold text-[10px]">
                      🏢 {doc.branchName}
                    </span>
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-800">
                    <span className="font-extrabold text-slate-900">{doc.items.length}</span> turdagi ({totalItemsQty} dona)
                  </td>
                  <td className="p-2 border-r border-slate-200 font-black text-slate-900 text-right font-mono text-xs whitespace-nowrap">
                    {doc.totalAmount.toLocaleString('ru-RU')} UZS
                  </td>
                  <td className="p-2 border-r border-slate-200 text-center">
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Qabul qilingan</span>
                    </span>
                  </td>
                  <td className="p-2 text-right flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setViewDoc(doc)}
                      className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      title="Ichki ma'lumotlarni ko'rish"
                    >
                      <Package className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setViewDoc(doc);
                        setTimeout(() => printElementById('printable-prixod', `Prixod_${doc.docNumber}`), 200);
                      }}
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
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

      {/* Modal Add New Prixod */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                <span>Yangi Kirim Hujjati (Prixod)</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrixod} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Yetkazib Beruvchi Nomi:</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Nestle Uzbekistan"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Qabul Qiluvchi Ombor / Filial:</label>
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
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Kirim Qilinadigan Tovar Pozitsiyalari:</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pozitsiya Qo'shish</span>
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
                          placeholder="Kirim narxi"
                          value={item.costPrice}
                          onChange={(e) => handleItemChange(idx, 'costPrice', Number(e.target.value))}
                          className="w-full bg-slate-900 text-slate-100 p-2 rounded-lg border border-slate-700 text-right text-xs"
                        />
                      </div>

                      <div className="w-28 text-right font-bold text-emerald-400 text-xs">
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

              {/* Total Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Jami Kirim Summasi:</span>
                <span className="text-base font-black text-emerald-400">
                  {totalInvoiceAmount.toLocaleString()} UZS
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
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg"
                >
                  Prixod qilish va Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: VIEW PRIXOD DETAILS & PRINT NAKLADNOY */}
      {viewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div id="printable-prixod" className="bg-white border border-slate-300 rounded-2xl p-5 max-w-2xl w-full space-y-4 shadow-2xl font-sans text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Kirim Hujjati (Nakladnoy)</span>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Hujjat № {viewDoc.docNumber}</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Qabul qilingan
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
                <span className="text-[10px] text-slate-400 block">Yetkazib Beruvchi:</span>
                <strong className="text-slate-900">{viewDoc.supplierName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Ombor / Filial:</span>
                <strong className="text-slate-900">{viewDoc.branchName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Mas'ul Shaxs:</span>
                <strong className="text-slate-900">{viewDoc.createdBy}</strong>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#24275f] text-white font-semibold">
                  <tr>
                    <th className="p-2 border-r border-indigo-900">№</th>
                    <th className="p-2 border-r border-indigo-900">Mahsulot Nomi</th>
                    <th className="p-2 border-r border-indigo-900 text-center">Soni (Middat)</th>
                    <th className="p-2 border-r border-indigo-900 text-right">Kirim Narxi</th>
                    <th className="p-2 text-right">Jami Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewDoc.items.map((item, index) => (
                    <tr key={index} className="even:bg-slate-50 font-medium text-slate-800">
                      <td className="p-2 border-r border-slate-200 text-center text-slate-400">{index + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{item.productName}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-800">{item.qty} dona</td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">{item.costPrice.toLocaleString('ru-RU')} SUM</td>
                      <td className="p-2 text-right font-black font-mono text-emerald-800">{(item.qty * item.costPrice).toLocaleString('ru-RU')} SUM</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="font-bold text-emerald-950">Jami Hujjat Summasi:</span>
              <span className="font-black text-sm text-emerald-900 font-mono">
                {viewDoc.totalAmount.toLocaleString('ru-RU')} SUM
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => printElementById('printable-prixod', `Prixod_${viewDoc.docNumber}`)}
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
