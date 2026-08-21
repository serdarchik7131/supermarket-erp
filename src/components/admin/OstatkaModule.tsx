import React, { useState, useEffect } from 'react';
import { printElementById } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';
import {
  Layers,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  Building2,
  PackageCheck,
  TrendingDown,
  Filter,
  DollarSign,
  Printer,
} from 'lucide-react';
import { Product, Branch, Category } from '../../types';
import { fetchProducts, fetchBranches, fetchCategories } from '../../services/api';
import { getAutoProductImage } from '../../utils/productUtils';

export const OstatkaModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'zero'>('all');

  useEffect(() => {
    Promise.all([fetchProducts(), fetchBranches(), fetchCategories()]).then(
      ([pList, bList, cList]) => {
        setProducts(pList);
        setBranches(bList);
        setCategories(cList);
      }
    );
  }, []);

  const exportStockCSV = () => {
    exportToExcel({
      filename: `ombor_qoldiqlari_${Date.now()}`,
      title: 'TRADEUZ SFA — Ombor Qoldiqlari va Aktivlar Qiymati Hisoboti',
      subtitle: `Filtr bo'yicha jami: ${filteredProducts.length} ta mahsulot`,
      columns: [
        { header: '№', key: 'index', align: 'center' },
        { header: 'Mahsulot Nomi', key: 'name', align: 'left' },
        { header: 'SKU / Kodu', key: 'sku', align: 'center' },
        { header: 'Shtrixkod', key: 'barcode', align: 'center' },
        { header: 'Toshkent Asosiy', key: 'toshkent', align: 'center' },
        { header: 'Chilonzor', key: 'chilanzar', align: 'center' },
        { header: 'Samarqand', key: 'samarkand', align: 'center' },
        { header: 'Jami Qoldiq', key: 'totalStock', align: 'center' },
        { header: 'Tan Narxi (UZS)', key: 'costPrice', align: 'right' },
        { header: 'Jami Aktiv Qiymati (UZS)', key: 'totalValuation', align: 'right' },
        { header: 'Holat', key: 'status', align: 'center' },
      ],
      data: filteredProducts.map((p, idx) => {
        const t = p.stockByBranch.br_toshkent_main || 0;
        const c = p.stockByBranch.br_chilanzar || 0;
        const s = p.stockByBranch.br_samarkand || 0;
        const total = (Object.values(p.stockByBranch || {}) as number[]).reduce((a, b) => a + Number(b), 0);
        const totalVal = total * p.costPrice;
        const statusText = total === 0 ? 'Tugagan' : total <= p.minStockAlert ? 'Kam qolgan' : 'Etarli';
        return {
          index: idx + 1,
          name: p.nameUz,
          sku: p.sku,
          barcode: p.barcode,
          toshkent: `${t} ${p.unit}`,
          chilanzar: `${c} ${p.unit}`,
          samarkand: `${s} ${p.unit}`,
          totalStock: `${total} ${p.unit}`,
          costPrice: p.costPrice.toLocaleString('uz-UZ'),
          totalValuation: totalVal.toLocaleString('uz-UZ'),
          status: statusText,
        };
      }),
      summary: {
        name: 'JAMI OMBOR QOLDIQ YIG\'INDI:',
        totalValuation: filteredProducts
          .reduce((sum, p) => sum + ((Object.values(p.stockByBranch || {}) as number[]).reduce((a, b) => a + Number(b), 0) * p.costPrice), 0)
          .toLocaleString('uz-UZ') + ' UZS',
      },
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      !searchQuery ||
      p.nameUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());

    // Total stock or branch specific stock
    let totalStock = 0;
    if (selectedBranch === 'all') {
      totalStock = (Object.values(p.stockByBranch || {}) as number[]).reduce((a, b) => a + Number(b), 0);
    } else {
      totalStock = p.stockByBranch[selectedBranch as keyof typeof p.stockByBranch] || 0;
    }

    let matchStatus = true;
    if (stockStatusFilter === 'low') {
      matchStatus = totalStock > 0 && totalStock <= p.minStockAlert;
    } else if (stockStatusFilter === 'zero') {
      matchStatus = totalStock === 0;
    }

    return matchCat && matchSearch && matchStatus;
  });

  // Calculate KPIs
  const totalItemsCount = filteredProducts.length;
  let totalStockQuantity = 0;
  let totalInventoryValuation = 0;
  let lowStockAlertCount = 0;

  products.forEach((p) => {
    const total = (Object.values(p.stockByBranch || {}) as number[]).reduce((a, b) => a + Number(b), 0);
    totalStockQuantity += total;
    totalInventoryValuation += total * p.costPrice;
    if (total <= p.minStockAlert) {
      lowStockAlertCount += 1;
    }
  });

  return (
    <div className="space-y-2 text-xs font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>Ombor Qoldiqlari — Ostatka (Tradeuz SFA)</span>
            </h2>
            <p className="text-[10px] text-slate-500">
              Barcha filial va omborlardagi tovarlar qoldig'i, baholangan qiymati va kritik limitlar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-bold text-slate-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
            Jami Qiymat: <span className="text-emerald-700 font-extrabold">{totalInventoryValuation.toLocaleString('ru-RU')} SUM</span>
          </div>

          <button
            onClick={() => printElementById('printable-ostatka', 'Ombor_Qoldiqlari')}
            className="bg-[#24275f] hover:bg-indigo-900 text-white font-bold px-3 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs"
            title="Chop etish"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Chop etish</span>
          </button>

          <button
            onClick={exportStockCSV}
            className="bg-[#22c55e] hover:bg-green-600 text-white font-bold px-3 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-200/70 p-1.5 rounded-lg border border-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1.5 text-slate-400" />
            <input
              type="text"
              placeholder="Nomi, SKU yoki Shtrix-kod..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 pl-8 pr-2 py-1 rounded text-[11px] focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 px-2 py-1 rounded text-[11px] font-bold focus:outline-none"
          >
            <option value="all">🌐 Barcha Filiallar Qoldig'i</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>🏢 {b.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 px-2 py-1 rounded text-[11px] focus:outline-none"
          >
            <option value="all">Barcha Toifalar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nameUz}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              stockStatusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Barchasi
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              stockStatusFilter === 'low'
                ? 'bg-amber-600 text-white'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            ⚠️ Kam qolgan
          </button>
          <button
            onClick={() => setStockStatusFilter('zero')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              stockStatusFilter === 'zero'
                ? 'bg-rose-600 text-white'
                : 'text-rose-800 hover:bg-rose-50'
            }`}
          >
            🚫 Tugagan (0)
          </button>
        </div>
      </div>

      {/* Stock Matrix Table */}
      <div id="printable-ostatka" className="bg-white border border-slate-300 rounded-lg overflow-x-auto custom-scrollbar shadow-xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#24275f] text-white font-semibold border-b border-indigo-900">
            <tr>
              <th className="p-1.5 border-r border-indigo-900">Mahsulot</th>
              <th className="p-1.5 border-r border-indigo-900 font-mono">SKU / Barcode</th>
              <th className="p-1.5 border-r border-indigo-900">Qoldiq (Filiallar)</th>
              <th className="p-1.5 border-r border-indigo-900 text-right">Jami Qoldiq</th>
              <th className="p-1.5 border-r border-indigo-900 text-right">Tan Narxi</th>
              <th className="p-1.5 border-r border-indigo-900 text-right">Jami Aktiv Qiymati</th>
              <th className="p-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
            {filteredProducts.map((p) => {
              const toshkentQty = p.stockByBranch.br_toshkent_main || 0;
              const chilanzarQty = p.stockByBranch.br_chilanzar || 0;
              const samarkandQty = p.stockByBranch.br_samarkand || 0;
              const totalStock = (Object.values(p.stockByBranch || {}) as number[]).reduce((a, b) => a + Number(b), 0);
              const totalValuation = totalStock * p.costPrice;
              const isLow = totalStock <= p.minStockAlert;

              return (
                <tr key={p.id} className="hover:bg-blue-50/70 transition-colors even:bg-slate-50/50">
                  <td className="p-1.5 border-r border-slate-200 flex items-center gap-2">
                    <img src={getAutoProductImage(p)} alt={p.nameUz} className="w-6 h-6 object-contain rounded bg-slate-50 border border-slate-200 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 block leading-none">{p.nameUz}</span>
                      <span className="text-[10px] text-slate-500 font-mono">dona</span>
                    </div>
                  </td>

                  <td className="p-1.5 border-r border-slate-200 font-mono text-[10px] text-slate-700">
                    <div>{p.sku}</div>
                    <div className="text-slate-400 text-[9px]">{p.barcode}</div>
                  </td>

                  <td className="p-1.5 border-r border-slate-200">
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <span className="bg-blue-50 text-blue-800 px-1 py-0.5 rounded border border-blue-200">Toshkent: {toshkentQty}</span>
                      <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-200">Chilonzor: {chilanzarQty}</span>
                    </div>
                  </td>

                  <td className="p-1.5 border-r border-slate-200 text-right font-black font-mono text-slate-900">
                    {totalStock} dona
                  </td>

                  <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">
                    {p.costPrice.toLocaleString('ru-RU')} SUM
                  </td>

                  <td className="p-1.5 border-r border-slate-200 text-right font-black font-mono text-emerald-700 whitespace-nowrap">
                    {totalValuation.toLocaleString('ru-RU')} SUM
                  </td>

                  <td className="p-1.5 text-center">
                    {totalStock === 0 ? (
                      <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        🚫 Tugagan
                      </span>
                    ) : isLow ? (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        ⚠️ Kam qolgan
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        ✅ Etarli
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
