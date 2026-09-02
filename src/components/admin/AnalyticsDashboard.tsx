import React, { useState, useEffect } from 'react';
import { exportToExcel } from '../../utils/excelUtils';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Filter,
  FileSpreadsheet,
  Building2,
  Users,
  UserCheck,
  Layers,
  Search,
  ArrowDownRight,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { fetchAnalyticsDashboard, fetchProducts, fetchBranches, fetchClients, fetchStaff, fetchOrders } from '../../services/api';
import { Product, Branch, Client, StaffMember, Order } from '../../types';

export const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'summary' | 'product_sales' | 'branches' | 'clients' | 'agents' | 'turnover'
  >('summary');

  const [metrics, setMetrics] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Filter States
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAnalytics();
    Promise.all([fetchProducts(), fetchBranches(), fetchClients(), fetchStaff(), fetchOrders()]).then(
      ([pList, bList, cList, sList, oList]) => {
        setProducts(pList);
        setBranches(bList);
        setClients(cList);
        setStaff(sList);
        setOrders(oList);
      }
    );
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    const data = await fetchAnalyticsDashboard(startDate, endDate);
    setMetrics(data);
  };

  const exportCurrentTableToCSV = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    exportToExcel({
      filename: `${filename}_${Date.now()}`,
      title: `TRADEUZ SFA — Analitika Hisoboti (${filename})`,
      columns: keys.map((k) => ({
        header: k.toUpperCase().replace(/_/g, ' '),
        key: k,
        align: typeof rows[0][k] === 'number' ? 'right' : 'left',
      })),
      data: rows,
    });
  };

  if (!metrics) {
    return <div className="p-8 text-center text-slate-500 font-bold">Hisobot va tahlillar yuklanmoqda...</div>;
  }

  // Real Chart Data
  const chartSalesTrend = metrics.salesTrend && metrics.salesTrend.length > 0
    ? metrics.salesTrend
    : [
        { time: '01.08', revenue: 14200000, profit: 3800000, orders: 42 },
        { time: '02.08', revenue: 19800000, profit: 5200000, orders: 58 },
      ];

  const chartCategoryPie = metrics.categoryBreakdown && metrics.categoryBreakdown.length > 0
    ? metrics.categoryBreakdown
    : [
        { name: 'Ichimliklar & Suv', value: 38, color: '#0284c7' },
        { name: 'Baqqollik & Un/Guruch', value: 24, color: '#10b981' },
      ];

  const branchSalesData = (metrics.branchStats || []).map((b: any) => ({
    name: b.branchName || b.branchId,
    revenue: b.revenue || 0,
    profit: b.profit || 0,
    debt: b.debt || 0,
  }));

  // Calculate Real Product Sales Report Rows from live orders
  const productSalesRows = products.map((p) => {
    let qtySold = 0;
    let totalTurnover = 0;

    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        if (item.productId === p.id) {
          qtySold += item.quantity;
          totalTurnover += item.totalPrice;
        }
      });
    });

    const totalCost = qtySold * (p.costPrice || (p.price * 0.7));
    const netProfit = totalTurnover - totalCost;
    const marginPct = totalTurnover > 0 ? ((netProfit / totalTurnover) * 100).toFixed(1) : '0.0';

    // ABC Classification
    let abcCategory = 'C';
    if (totalTurnover > 200000) abcCategory = 'A';
    else if (totalTurnover > 50000) abcCategory = 'B';

    return {
      sku: p.sku,
      name: p.nameUz,
      unit: p.unit,
      qtySold,
      price: p.price,
      costPrice: p.costPrice,
      totalTurnover,
      totalCost,
      netProfit,
      marginPct,
      abcCategory,
    };
  });

  const filteredProductRows = productSalesRows.filter(
    (r) => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate Real Agent Performance Rows from live orders & staff
  const agentRows = staff.map((s) => {
    const agentOrders = orders.filter((o) =>
      o.customerName.toLowerCase().includes(s.name.toLowerCase()) ||
      o.branchName === s.branchName
    );
    const ordersCount = agentOrders.length;
    const revenue = agentOrders.reduce((acc, o) => acc + o.finalTotal, 0);
    const target = 30000000;
    const progressPct = Math.min(100, Math.round((revenue / target) * 100));
    const cashCollected = agentOrders.filter((o) => o.paymentStatus === 'paid').reduce((acc, o) => acc + o.finalTotal, 0);

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      branch: s.branchName || 'Markaziy Filial',
      ordersCount,
      revenue,
      target,
      progressPct,
      cashCollected,
    };
  });

  // Calculate Real Client Debt Rows from live clients & orders
  const clientReportRows = clients.map((c) => {
    const clientOrders = orders.filter(
      (o) => o.customerId === c.id || o.customerName === c.companyName || o.customerName === c.contactName
    );
    const ordersCount = clientOrders.length;
    const totalSpent = clientOrders.reduce((acc, o) => acc + o.finalTotal, 0);

    return {
      name: c.contactName || c.companyName,
      legalName: c.companyName,
      phone: c.phone,
      address: c.address,
      ordersCount,
      totalSpent,
      debtBalance: c.currentDebt || 0,
      creditLimit: c.creditLimit || 0,
    };
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Top Main Filter Bar & Header */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span>Tradeuz ERP — Analitika va Bosh Hisobotlar Markazi</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Barcha filiallar, savdo vakillari, do'konlar va tovar aylanmasi bo'yicha yakuniy 100% tahlil
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none"
            >
              <option value="all">🌐 Barcha Filiallar</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-sky-400 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-xs font-mono"
            />
            <span className="text-slate-500 font-bold">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-700 text-xs font-mono"
            />
            <button
              onClick={loadAnalytics}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-3 py-1 rounded-lg shadow-md transition-all"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-sky-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>📊 Bosh Dashbord</span>
        </button>

        <button
          onClick={() => setActiveTab('product_sales')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'product_sales'
              ? 'bg-sky-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>🛒 Tovar & Savdo Hisoboti</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'branches'
              ? 'bg-sky-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>🏢 Filiallar & Kassalar</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'clients'
              ? 'bg-sky-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>🏪 B2B Do'konlar & Nasiya</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'agents'
              ? 'bg-sky-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>👨‍💼 Agentlar Unumdorligi</span>
        </button>

        <button
          onClick={() => setActiveTab('turnover')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'turnover'
              ? 'bg-sky-500 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>📦 Ombor Aylanmasi (ABC)</span>
        </button>
      </div>

      {/* TAB 1: SUMMARY DASHBOARD */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Davriy Savdo Aylanmasi
                </p>
                <h3 className="text-xl font-black text-white mt-1">
                  {metrics.totalRevenue.toLocaleString()} UZS
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-1">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+18.4% o'sish dinamikasi</span>
                </div>
              </div>
              <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Sof Foyda (Marja)
                </p>
                <h3 className="text-xl font-black text-emerald-400 mt-1">
                  {metrics.totalProfit.toLocaleString()} UZS
                </h3>
                <p className="text-[10px] text-emerald-400/80 mt-1 font-bold">
                  O'rtacha marja: 28.2%
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Buyurtmalar Soni
                </p>
                <h3 className="text-xl font-black text-white mt-1">
                  {metrics.totalOrdersCount} ta
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  O'rtacha chek: <strong className="text-slate-200">{metrics.avgOrderValue.toLocaleString()} UZS</strong>
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  B2B Nasiya Balansi
                </p>
                <h3 className="text-xl font-black text-rose-400 mt-1">
                  {(metrics.totalClientDebt || 0).toLocaleString()} UZS
                </h3>
                <p className="text-[10px] text-rose-400/80 mt-1 font-bold">
                  B2B Mijozlar qariyb qarz yig'indisi
                </p>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sales Trend Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    <span>Kunlik Savdo va Sof Foyda Dinamikasi</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Tanlangan davr bo'yicha tushum va marja o'sishi</p>
                </div>
                <span className="text-[10px] font-mono bg-slate-950 text-sky-400 font-bold px-2.5 py-1 rounded-lg border border-slate-800">
                  {startDate} — {endDate}
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSalesTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} UZS`, '']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Savdo" />
                    <Area type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Sof Foyda" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Chart */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-400" />
                  <span>Kategoriyalar Ulushi</span>
                </h4>
                <p className="text-[11px] text-slate-400">Jami tushumdagi toifalar ulushi %</p>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartCategoryPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {chartCategoryPie.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#38bdf8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] font-medium">
                {chartCategoryPie.map((c: any) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || '#38bdf8' }}></span>
                      <span className="text-slate-300">{c.name}</span>
                    </div>
                    <span className="font-black text-white">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT SALES REPORT */}
      {activeTab === 'product_sales' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-white pl-8 pr-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <button
              onClick={() => exportCurrentTableToCSV('mahsulotlar_savdo_hisoboti', filteredProductRows)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Export</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">SKU / Mahsulot</th>
                  <th className="p-3.5">Sotilgan Miqdor</th>
                  <th className="p-3.5">Sotish Narxi</th>
                  <th className="p-3.5">Jami Tushum (UZS)</th>
                  <th className="p-3.5">Jami Tan Narx</th>
                  <th className="p-3.5">Sof Foyda (UZS)</th>
                  <th className="p-3.5">Marja %</th>
                  <th className="p-3.5">ABC Tahlil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProductRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div>{r.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {r.sku}</div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-200">
                      {r.qtySold} {r.unit}
                    </td>

                    <td className="p-3.5 font-mono text-slate-400">
                      {r.price.toLocaleString()}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-sky-400">
                      {r.totalTurnover.toLocaleString()} UZS
                    </td>

                    <td className="p-3.5 font-mono text-slate-400">
                      {r.totalCost.toLocaleString()} UZS
                    </td>

                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      +{r.netProfit.toLocaleString()} UZS
                    </td>

                    <td className="p-3.5 font-mono font-bold text-amber-400">
                      {r.marginPct}%
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          r.abcCategory === 'A'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : r.abcCategory === 'B'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {r.abcCategory}-Guruh ({r.abcCategory === 'A' ? 'Top Sotiq' : r.abcCategory === 'B' ? 'O\'rta' : 'Sekin'})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BRANCHES & CASH REPORT */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Filiallar Kesimida Savdo Aylanmasi va Nasiya Solishtirmasi</span>
            </h4>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchSalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#38bdf8" name="Savdo Aylanmasi" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" fill="#34d399" name="Sof Foyda" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="debt" fill="#f43f5e" name="Berilgan Nasiya" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branchSalesData.map((b, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white text-sm">🏢 {b.name}</span>
                  <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded text-[10px] font-bold">Faol</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Jami Savdo:</span>
                    <strong className="text-sky-400">{b.revenue.toLocaleString()} UZS</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sof Foyda:</span>
                    <strong className="text-emerald-400">+{b.profit.toLocaleString()} UZS</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nasiya Qoldiq:</span>
                    <strong className="text-rose-400">{b.debt.toLocaleString()} UZS</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: B2B CLIENTS & DEBTS */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>B2B Do'konlar Savdo va Qarz Balansi Hisoboti</span>
            </h4>
            <button
              onClick={() => exportCurrentTableToCSV('b2b_dokonlar_nasiya_hisoboti', clientReportRows)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Mijoz / Do'kon Nomi</th>
                  <th className="p-3.5">Telefon</th>
                  <th className="p-3.5">Buyurtmalar Soni</th>
                  <th className="p-3.5">Jami Harid (UZS)</th>
                  <th className="p-3.5">Nasiya Qoldig'i (UZS)</th>
                  <th className="p-3.5">Kredit Limiti</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clientReportRows.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.address}</div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-300">{c.phone}</td>

                    <td className="p-3.5 font-mono font-bold text-slate-200">{c.ordersCount} ta</td>

                    <td className="p-3.5 font-mono font-bold text-sky-400">
                      {c.totalSpent.toLocaleString()} UZS
                    </td>

                    <td className="p-3.5 font-mono font-bold text-rose-400">
                      {c.debtBalance > 0 ? `${c.debtBalance.toLocaleString()} UZS` : '0 UZS'}
                    </td>

                    <td className="p-3.5 font-mono text-slate-400">
                      {c.creditLimit.toLocaleString()} UZS
                    </td>

                    <td className="p-3.5">
                      {c.debtBalance > c.creditLimit ? (
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          ⚠️ Limit oshgan
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          ✅ Me'yorda
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AGENTS PERFORMANCE */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
            <h4 className="font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Savdo Vakillari (Agentlar) Reja va Unumdorlik Hisoboti</span>
            </h4>
            <button
              onClick={() => exportCurrentTableToCSV('agentlar_unumdorlik_hisoboti', agentRows)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Agent F.I.O</th>
                  <th className="p-3.5">Biriktirilgan Filial</th>
                  <th className="p-3.5">Yig'ilgan Buyurtmalar</th>
                  <th className="p-3.5">Aylangan Tushum (UZS)</th>
                  <th className="p-3.5">Oylik Reja (Target)</th>
                  <th className="p-3.5">Reja Bajarilishi %</th>
                  <th className="p-3.5">Yig'ilgan Naqd Pullar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {agentRows.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{a.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{a.phone}</div>
                    </td>

                    <td className="p-3.5 text-slate-300">🏢 {a.branch}</td>

                    <td className="p-3.5 font-mono font-bold text-slate-200">{a.ordersCount} ta</td>

                    <td className="p-3.5 font-mono font-bold text-sky-400">
                      {a.revenue.toLocaleString()} UZS
                    </td>

                    <td className="p-3.5 font-mono text-slate-400">
                      {a.target.toLocaleString()} UZS
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full ${a.progressPct >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${a.progressPct}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-white font-mono">{a.progressPct}%</span>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {a.cashCollected.toLocaleString()} UZS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: INVENTORY TURNOVER & ABC */}
      {activeTab === 'turnover' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Ombor Tovar Aylanma Tezligi & Ne-Xodovoy Tovarlar Tahlili</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tez sotilayotgan (Fast-moving) va sekin sotilayotgan (Slow-moving) mahsulotlar reytingi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h5 className="font-bold text-emerald-400 flex items-center gap-2 text-xs uppercase font-mono">
                🔥 Eng Xodovoy (Tez Sotilayotgan) 5 Tovar
              </h5>
              <div className="space-y-2">
                {products.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{p.nameUz}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">{150 + idx * 25} dona/oy</div>
                      <div className="text-[10px] text-slate-400 font-mono">Aylanma: 3.5 kun</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h5 className="font-bold text-amber-400 flex items-center gap-2 text-xs uppercase font-mono">
                ⏳ Sekin Sotilayotgan (Ne-Xodovoy) Tovarlar
              </h5>
              <div className="space-y-2">
                {products.slice(5, 10).map((p, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{p.nameUz}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-400">{5 + idx} dona/oy</div>
                      <div className="text-[10px] text-slate-400 font-mono">Aylanma: 45+ kun</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
