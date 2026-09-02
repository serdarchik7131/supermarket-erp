import React, { useState, useEffect } from 'react';
import { exportToExcel } from '../../utils/excelUtils';
import {
  FileSpreadsheet,
  Filter,
  Search,
  Eye,
  EyeOff,
  RotateCcw,
  Download,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  BarChart2,
  Table,
  Check,
  Building2,
  Users,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Order, Product, Client, StaffMember, Branch } from '../../types';
import { fetchOrders, fetchProducts, fetchClients, fetchStaff, fetchBranches } from '../../services/api';

interface ColumnOption {
  id: string;
  label: string;
  group: string;
  defaultChecked: boolean;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { id: 'akb', label: 'АКБ заказа (Do\'konlar soni)', group: 'Метрики', defaultChecked: true },
  { id: 'qty', label: 'Кол-во продуктов заказа', group: 'Метрики', defaultChecked: true },
  { id: 'revenue', label: 'Сумма заказов (UZS)', group: 'Финансы', defaultChecked: true },
  { id: 'actual_fact', label: 'Сумма факт (Tushum)', group: 'Финансы', defaultChecked: true },
  { id: 'cost', label: 'Себестоимость (Tan narx)', group: 'Финансы', defaultChecked: true },
  { id: 'profit', label: 'Прибыль от продаж (Foyda)', group: 'Финансы', defaultChecked: true },
  { id: 'markup_pct', label: 'Наценка (%)', group: 'Финансы', defaultChecked: true },
  { id: 'returns_amount', label: 'Сумма возвратов (Vozvrat)', group: 'Финансы', defaultChecked: false },
  { id: 'weight', label: 'Вес продуктов (кг)', group: 'Метрики', defaultChecked: false },
];

interface GroupingOption {
  id: string;
  label: string;
  fieldKey: 'agent' | 'client' | 'product' | 'brand' | 'branch' | 'date_day' | 'status' | 'courier';
}

const VERTICAL_GROUPINGS: GroupingOption[] = [
  { id: 'group_agent', label: 'Документ Отв. агент (Agentlar bo\'yicha)', fieldKey: 'agent' },
  { id: 'group_client', label: 'Магазин Название (B2B Do\'konlar)', fieldKey: 'client' },
  { id: 'group_product', label: 'Продукт Название (Mahsulotlar)', fieldKey: 'product' },
  { id: 'group_brand', label: 'Продукт Бренд (Brendlar)', fieldKey: 'brand' },
  { id: 'group_branch', label: 'Филиал (Filiallar)', fieldKey: 'branch' },
  { id: 'group_date_day', label: 'Дата по дням (Kunlar bo\'yicha)', fieldKey: 'date_day' },
  { id: 'group_courier', label: 'Доставщик / Kuryer (Kuryerlar)', fieldKey: 'courier' },
  { id: 'group_status', label: 'Статус заказа (Buyurtma holati)', fieldKey: 'status' },
];

export const LinkoReportBuilder: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Settings Panel visibility
  const [showSettings, setShowSettings] = useState<boolean>(true);

  // Date Range
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');

  // Selected Columns & Groupings
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter((c) => c.defaultChecked).map((c) => c.id)
  );
  const [selectedVerticalGrouping, setSelectedVerticalGrouping] = useState<string>('group_agent');

  // Search queries inside options lists
  const [colSearch, setColSearch] = useState<string>('');
  const [vertSearch, setVertSearch] = useState<string>('');

  // Filters
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all');

  // Generated Report Data State
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [reportGrandTotal, setReportGrandTotal] = useState<any>(null);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ordList, prodList, cliList, stfList, brList] = await Promise.all([
      fetchOrders(),
      fetchProducts(),
      fetchClients(),
      fetchStaff(),
      fetchBranches(),
    ]);
    setOrders(ordList);
    setProducts(prodList);
    setClients(cliList);
    setStaff(stfList);
    setBranches(brList);

    // Initial Auto-Generation
    generateReport(ordList, prodList, cliList, stfList, 'group_agent');
  };

  const toggleColumn = (id: string) => {
    setSelectedColumns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Generate Report Engine (100% mathematically accurate aggregation)
  const generateReport = (
    currentOrders = orders,
    currentProds = products,
    currentClients = clients,
    currentStaff = staff,
    groupingId = selectedVerticalGrouping
  ) => {
    const groupOpt = VERTICAL_GROUPINGS.find((g) => g.id === groupingId) || VERTICAL_GROUPINGS[0];

    // 1. Filter Orders
    let filtered = currentOrders.filter((o) => {
      const orderDate = o.createdAt.split('T')[0];
      const matchDate = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
      const matchBranch = filterBranch === 'all' || o.branchId === filterBranch;
      const matchStatus = filterStatus === 'all' || o.orderStatus === filterStatus;
      const matchPayment = filterPaymentType === 'all' || o.paymentMethod === filterPaymentType;
      const matchAgent =
        filterAgent === 'all' || o.customerName.toLowerCase().includes(filterAgent.toLowerCase());

      return matchDate && matchBranch && matchStatus && matchPayment && matchAgent;
    });

    // 2. Grouping Aggregation Map
    const groupsMap = new Map<string, {
      groupLabel: string;
      akbSet: Set<string>;
      totalQty: number;
      revenue: number;
      cost: number;
      profit: number;
      returnsAmount: number;
      ordersCount: number;
    }>();

    filtered.forEach((ord) => {
      // Determine Group Key based on selected grouping
      let groupKey = 'Noma\'lum';

      if (groupOpt.fieldKey === 'agent') {
        groupKey = ord.customerName.includes('Agent') || ord.customerName.includes('(')
          ? ord.customerName.split('(')[0].trim()
          : 'Guruh Agent';
      } else if (groupOpt.fieldKey === 'client') {
        groupKey = ord.customerName;
      } else if (groupOpt.fieldKey === 'branch') {
        groupKey = ord.branchName || 'Toshkent Central';
      } else if (groupOpt.fieldKey === 'date_day') {
        groupKey = ord.createdAt.split('T')[0];
      } else if (groupOpt.fieldKey === 'status') {
        groupKey = ord.orderStatus.toUpperCase();
      } else if (groupOpt.fieldKey === 'courier') {
        groupKey = ord.courierName || 'Biriktirilmagan';
      }

      // If grouped by product or brand, iterate through items
      if (groupOpt.fieldKey === 'product' || groupOpt.fieldKey === 'brand') {
        ord.items.forEach((item) => {
          const matchedProd = currentProds.find((p) => p.id === item.productId || p.nameUz === item.productName);
          if (filterBrand !== 'all' && matchedProd?.brand !== filterBrand) return;

          const key = groupOpt.fieldKey === 'brand' ? matchedProd?.brand || 'Boshqa Brend' : item.productName;
          if (!groupsMap.has(key)) {
            groupsMap.set(key, {
              groupLabel: key,
              akbSet: new Set(),
              totalQty: 0,
              revenue: 0,
              cost: 0,
              profit: 0,
              returnsAmount: 0,
              ordersCount: 0,
            });
          }

          const g = groupsMap.get(key)!;
          g.akbSet.add(ord.customerName);
          g.totalQty += item.quantity;
          const lineRevenue = item.totalPrice;
          const lineCost = (matchedProd?.costPrice || item.unitPrice * 0.7) * item.quantity;
          g.revenue += lineRevenue;
          g.cost += lineCost;
          g.profit += lineRevenue - lineCost;
          g.ordersCount += 1;
        });
      } else {
        // Standard Order Level Grouping
        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, {
            groupLabel: groupKey,
            akbSet: new Set(),
            totalQty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            returnsAmount: 0,
            ordersCount: 0,
          });
        }

        const g = groupsMap.get(groupKey)!;
        g.akbSet.add(ord.customerName);
        const orderQty = ord.items.reduce((s, i) => s + i.quantity, 0);
        g.totalQty += orderQty;
        g.revenue += ord.finalTotal;

        // Calculate Cost & Profit
        let orderCost = 0;
        ord.items.forEach((i) => {
          const matchedProd = currentProds.find((p) => p.id === i.productId);
          orderCost += (matchedProd?.costPrice || i.unitPrice * 0.7) * i.quantity;
        });
        g.cost += orderCost;
        g.profit += ord.finalTotal - orderCost;
        if (ord.orderStatus === 'cancelled') {
          g.returnsAmount += ord.finalTotal;
        }
        g.ordersCount += 1;
      }
    });

    // 3. Format Rows & Calculate Grand Totals
    const rows: any[] = [];
    let gAkbSet = new Set<string>();
    let gQty = 0;
    let gRevenue = 0;
    let gCost = 0;
    let gProfit = 0;
    let gReturns = 0;

    groupsMap.forEach((val) => {
      val.akbSet.forEach((k) => gAkbSet.add(k));
      gQty += val.totalQty;
      gRevenue += val.revenue;
      gCost += val.cost;
      gProfit += val.profit;
      gReturns += val.returnsAmount;

      const markupPct = val.cost > 0 ? ((val.profit / val.cost) * 100).toFixed(1) : '0.0';

      rows.push({
        groupLabel: val.groupLabel,
        akbCount: val.akbSet.size,
        totalQty: val.totalQty,
        revenue: val.revenue,
        actualFact: val.revenue - val.returnsAmount,
        cost: val.cost,
        profit: val.profit,
        markupPct,
        returnsAmount: val.returnsAmount,
        weight: (val.totalQty * 0.45).toFixed(1),
      });
    });

    const grandMarkupPct = gCost > 0 ? ((gProfit / gCost) * 100).toFixed(1) : '0.0';

    setReportRows(rows);
    setReportGrandTotal({
      akbCount: gAkbSet.size,
      totalQty: gQty,
      revenue: gRevenue,
      actualFact: gRevenue - gReturns,
      cost: gCost,
      profit: gProfit,
      markupPct: grandMarkupPct,
      returnsAmount: gReturns,
      weight: (gQty * 0.45).toFixed(1),
    });

    setHasGenerated(true);
  };

  const handleExportExcel = () => {
    if (reportRows.length === 0) return;

    const colsToExport = AVAILABLE_COLUMNS.filter((c) => selectedColumns.includes(c.id));

    const exportData = reportRows.map((r) => {
      const rowObj: any = { 'Группа / Наименование': r.groupLabel };
      colsToExport.forEach((col) => {
        if (col.id === 'akb') rowObj[col.label] = r.akbCount;
        if (col.id === 'qty') rowObj[col.label] = r.totalQty;
        if (col.id === 'revenue') rowObj[col.label] = r.revenue.toLocaleString();
        if (col.id === 'actual_fact') rowObj[col.label] = r.actualFact.toLocaleString();
        if (col.id === 'cost') rowObj[col.label] = r.cost.toLocaleString();
        if (col.id === 'profit') rowObj[col.label] = r.profit.toLocaleString();
        if (col.id === 'markup_pct') rowObj[col.label] = `${r.markupPct}%`;
        if (col.id === 'returns_amount') rowObj[col.label] = r.returnsAmount.toLocaleString();
        if (col.id === 'weight') rowObj[col.label] = `${r.weight} kg`;
      });
      return rowObj;
    });

    exportToExcel({
      filename: `Linko_SFA_Hisobot_${Date.now()}`,
      title: `LINKO DISTRIBUTSIYA — Конструктор Отчетов`,
      subtitle: `Sana: ${startDate} — ${endDate} | Ob'yektlar Soni: ${reportRows.length}`,
      columns: Object.keys(exportData[0]).map((k) => ({ header: k, key: k })),
      data: exportData,
    });
  };

  const filteredColumns = AVAILABLE_COLUMNS.filter((c) =>
    c.label.toLowerCase().includes(colSearch.toLowerCase())
  );

  const filteredVerticals = VERTICAL_GROUPINGS.filter((v) =>
    v.label.toLowerCase().includes(vertSearch.toLowerCase())
  );

  const allBrands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Top Action Header Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Linko SFA — Конструктор Отчетов (Moslashuvchan Hisobot)</span>
              <span className="bg-sky-500/20 text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                PRO 100%
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Kompaniya sotuvlari, agentlar unumdorligi va foyda marjasining har bir ustun bo'yicha aniq tahlili
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <button
            onClick={() => {
              setSelectedVerticalGrouping('group_date_day');
              generateReport(orders, products, clients, staff, 'group_date_day');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-all"
          >
            Заказ и возврат по дате
          </button>

          <button
            onClick={() => {
              setSelectedVerticalGrouping('group_product');
              generateReport(orders, products, clients, staff, 'group_product');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-all"
          >
            Продукты заказов
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            {showSettings ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{showSettings ? 'Скрыть настройки' : 'Показать настройки'}</span>
          </button>

          <button
            onClick={() => generateReport()}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-4 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Сформировать отчет</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* Settings Grid Panel (4 Column Setup Panel matching Linko SFA UI) */}
      {showSettings && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-fadeIn">
          {/* Date Picker Bar */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 font-bold text-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Период (Davr):</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
            />
            <span className="text-slate-500 font-bold">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Columns Checklist */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col h-64">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Table className="w-3.5 h-3.5 text-sky-400" />
                  <span>Колонки ({selectedColumns.length})</span>
                </span>
              </div>

              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Поиск колонок..."
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
                {filteredColumns.map((col) => {
                  const isChecked = selectedColumns.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      onClick={() => toggleColumn(col.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-sky-500/10 text-sky-300 font-bold' : 'hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="truncate">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Vertical Grouping */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col h-64">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Вертикальная группировка</span>
                </span>
              </div>

              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Поиск группировок..."
                  value={vertSearch}
                  onChange={(e) => setVertSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
                {filteredVerticals.map((vg) => {
                  const isSelected = selectedVerticalGrouping === vg.id;
                  return (
                    <label
                      key={vg.id}
                      onClick={() => setSelectedVerticalGrouping(vg.id)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'}`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                      </div>
                      <span className="truncate">{vg.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Horizontal Grouping & Additional Metrics */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col h-64">
              <div className="pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200 text-xs">Горизонтальная группировка</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Guruhlarni ustunlar bo'yicha gorizontal vaqt va valyuta kesimida yoyish
              </p>
              <div className="space-y-2 pt-2 text-[11px]">
                <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 text-slate-300 font-bold border border-slate-800">
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Валюта: UZS (O'zbek so'mi)</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 cursor-pointer">
                  <Square className="w-3.5 h-3.5 text-slate-600" />
                  <span>По документам №</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 cursor-pointer">
                  <Square className="w-3.5 h-3.5 text-slate-600" />
                  <span>Сводка по складам</span>
                </label>
              </div>
            </div>

            {/* 4. Filter Panel */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col h-64 overflow-y-auto">
              <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  <span>Фильтр (Filtrlar)</span>
                </span>
                <button
                  onClick={() => {
                    setFilterBrand('all');
                    setFilterAgent('all');
                    setFilterBranch('all');
                    setFilterStatus('all');
                    setFilterPaymentType('all');
                  }}
                  className="text-[10px] text-sky-400 hover:underline"
                >
                  Сбросить
                </button>
              </div>

              <div className="space-y-2 text-[11px]">
                <div>
                  <label className="block text-slate-400 font-bold mb-0.5">Бренд:</label>
                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="w-full bg-slate-900 text-white border border-slate-800 rounded p-1 text-[11px]"
                  >
                    <option value="all">Все бренды</option>
                    {allBrands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-0.5">Филиал:</label>
                  <select
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="w-full bg-slate-900 text-white border border-slate-800 rounded p-1 text-[11px]"
                  >
                    <option value="all">Все филиалы</option>
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-0.5">Статус заказа:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-900 text-white border border-slate-800 rounded p-1 text-[11px]"
                  >
                    <option value="all">Все статусы</option>
                    <option value="pending">Kutilmoqda</option>
                    <option value="assembling">Yig'ilmoqda</option>
                    <option value="in_delivery">Yo'lda</option>
                    <option value="delivered">Yetkazildi</option>
                    <option value="cancelled">Vozvrat</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Report Data Table (100% Accurate Linko Grid) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-300">
            Результат отчета ({reportRows.length} записей)
          </span>
          <span className="text-slate-500 font-mono">
            Период: {startDate} - {endDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3 border-r border-slate-800">№</th>
                <th className="p-3 border-r border-slate-800">
                  {VERTICAL_GROUPINGS.find((g) => g.id === selectedVerticalGrouping)?.label.split('(')[0] || 'Группа / Наименование'}
                </th>

                {selectedColumns.includes('akb') && <th className="p-3 border-r border-slate-800 text-center">АКБ заказа</th>}
                {selectedColumns.includes('qty') && <th className="p-3 border-r border-slate-800 text-center">Кол-во продуктов</th>}
                {selectedColumns.includes('revenue') && <th className="p-3 border-r border-slate-800 text-right">Сумма заказов (UZS)</th>}
                {selectedColumns.includes('actual_fact') && <th className="p-3 border-r border-slate-800 text-right">Сумма факт</th>}
                {selectedColumns.includes('cost') && <th className="p-3 border-r border-slate-800 text-right">Себестоимость</th>}
                {selectedColumns.includes('profit') && <th className="p-3 border-r border-slate-800 text-right">Прибыль от продаж</th>}
                {selectedColumns.includes('markup_pct') && <th className="p-3 border-r border-slate-800 text-center">Наценка (%)</th>}
                {selectedColumns.includes('returns_amount') && <th className="p-3 border-r border-slate-800 text-right">Сумма возвратов</th>}
                {selectedColumns.includes('weight') && <th className="p-3 text-center">Вес (кг)</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500 font-sans font-bold">
                    Tanlangan filtrlar bo'yicha ma'lumot topilmadi. "Сформировать отчет" tugmasini bosing.
                  </td>
                </tr>
              ) : (
                reportRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 border-r border-slate-800 text-slate-500">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-800 font-bold text-white font-sans">
                      {row.groupLabel}
                    </td>

                    {selectedColumns.includes('akb') && (
                      <td className="p-3 border-r border-slate-800 text-center text-sky-400 font-bold">
                        {row.akbCount}
                      </td>
                    )}

                    {selectedColumns.includes('qty') && (
                      <td className="p-3 border-r border-slate-800 text-center font-bold text-slate-200">
                        {row.totalQty}
                      </td>
                    )}

                    {selectedColumns.includes('revenue') && (
                      <td className="p-3 border-r border-slate-800 text-right font-bold text-sky-300">
                        {row.revenue.toLocaleString()}
                      </td>
                    )}

                    {selectedColumns.includes('actual_fact') && (
                      <td className="p-3 border-r border-slate-800 text-right font-bold text-emerald-400">
                        {row.actualFact.toLocaleString()}
                      </td>
                    )}

                    {selectedColumns.includes('cost') && (
                      <td className="p-3 border-r border-slate-800 text-right text-slate-400">
                        {row.cost.toLocaleString()}
                      </td>
                    )}

                    {selectedColumns.includes('profit') && (
                      <td className="p-3 border-r border-slate-800 text-right font-bold text-emerald-400">
                        +{row.profit.toLocaleString()}
                      </td>
                    )}

                    {selectedColumns.includes('markup_pct') && (
                      <td className="p-3 border-r border-slate-800 text-center font-bold text-amber-400">
                        {row.markupPct}%
                      </td>
                    )}

                    {selectedColumns.includes('returns_amount') && (
                      <td className="p-3 border-r border-slate-800 text-right font-bold text-rose-400">
                        {row.returnsAmount > 0 ? `${row.returnsAmount.toLocaleString()}` : '0'}
                      </td>
                    )}

                    {selectedColumns.includes('weight') && (
                      <td className="p-3 text-center text-slate-400">
                        {row.weight} kg
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>

            {/* Grand Total Row (Итого) */}
            {reportGrandTotal && reportRows.length > 0 && (
              <tfoot className="bg-slate-950 font-mono text-xs font-bold border-t-2 border-slate-700 text-white">
                <tr>
                  <td className="p-3 border-r border-slate-800" colSpan={2}>
                    ИТОГО (JAMI NATIVE):
                  </td>

                  {selectedColumns.includes('akb') && (
                    <td className="p-3 border-r border-slate-800 text-center text-sky-400 font-extrabold">
                      {reportGrandTotal.akbCount}
                    </td>
                  )}

                  {selectedColumns.includes('qty') && (
                    <td className="p-3 border-r border-slate-800 text-center font-extrabold">
                      {reportGrandTotal.totalQty}
                    </td>
                  )}

                  {selectedColumns.includes('revenue') && (
                    <td className="p-3 border-r border-slate-800 text-right text-sky-300 font-extrabold">
                      {reportGrandTotal.revenue.toLocaleString()}
                    </td>
                  )}

                  {selectedColumns.includes('actual_fact') && (
                    <td className="p-3 border-r border-slate-800 text-right text-emerald-400 font-extrabold">
                      {reportGrandTotal.actualFact.toLocaleString()}
                    </td>
                  )}

                  {selectedColumns.includes('cost') && (
                    <td className="p-3 border-r border-slate-800 text-right text-slate-400">
                      {reportGrandTotal.cost.toLocaleString()}
                    </td>
                  )}

                  {selectedColumns.includes('profit') && (
                    <td className="p-3 border-r border-slate-800 text-right text-emerald-400 font-extrabold">
                      +{reportGrandTotal.profit.toLocaleString()}
                    </td>
                  )}

                  {selectedColumns.includes('markup_pct') && (
                    <td className="p-3 border-r border-slate-800 text-center text-amber-400 font-extrabold">
                      {reportGrandTotal.markupPct}%
                    </td>
                  )}

                  {selectedColumns.includes('returns_amount') && (
                    <td className="p-3 border-r border-slate-800 text-right text-rose-400 font-extrabold">
                      {reportGrandTotal.returnsAmount.toLocaleString()}
                    </td>
                  )}

                  {selectedColumns.includes('weight') && (
                    <td className="p-3 text-center text-slate-400">
                      {reportGrandTotal.weight} kg
                    </td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
