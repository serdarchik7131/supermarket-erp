import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelector } from '../LanguageSelector';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  UserCheck,
  Building2,
  Wallet,
  Factory,
  Bell,
  Settings,
  ChevronDown,
  ArrowLeft,
  Package,
  FileSpreadsheet,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Layers,
  Truck,
  Sparkles,
  ShieldCheck,
  Tag,
  Star,
  Plus,
  Download,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  User,
  Check,
  Globe,
  Database,
  Lock as LockIcon,
  Sliders,
  MapPin,
} from 'lucide-react';
import { Branch, UserRole } from '../../types';
import { fetchBranches } from '../../services/api';
import { getStoreSettings, saveStoreSettings, StoreSettings } from '../../utils/storeSettings';

interface AdminLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTelegram: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  setActiveTab,
  onOpenTelegram,
  children,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [activeRole, setActiveRole] = useState<UserRole>('super_admin');
  const [activeWorkspace, setActiveWorkspace] = useState<string>('Tradeuz Distributsiya');

  // Store Settings State (Editable by Admin)
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());
  const [storeNameInput, setStoreNameInput] = useState<string>(storeSettings.storeName);
  const [storeBadgeInput, setStoreBadgeInput] = useState<string>(storeSettings.storeBadge);
  const [adminPinInput, setAdminPinInput] = useState<string>(storeSettings.adminPin);
  const [agentPinInput, setAgentPinInput] = useState<string>(storeSettings.agentPin);

  // Interactive Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchUpdateModalOpen, setIsBatchUpdateModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [starredModules, setStarredModules] = useState<string[]>(['products', 'orders', 'clients']);

  // Import State
  const [importTarget, setImportTarget] = useState<'products' | 'clients' | 'orders'>('products');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches().then((b) => setBranches(b));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleStarModule = (tabId: string) => {
    if (starredModules.includes(tabId)) {
      setStarredModules(starredModules.filter((id) => id !== tabId));
      showToast('Bo\'lim "Izbranniy" ro\'yxatidan olib tashlandi');
    } else {
      setStarredModules([...starredModules, tabId]);
      showToast('Bo\'lim "Izbranniy" ro\'yxatiga qo\'shildi ⭐');
    }
  };

  // Handle "Добавить" button dynamically based on active tab
  const handleUniversalAdd = () => {
    if (activeTab === 'products') {
      const btn = document.getElementById('tradeuz-add-product-trigger');
      if (btn) btn.click();
    } else {
      showToast(`"Yangi qo'shish" amali ishga tushirildi (${activeTab})`);
    }
  };

  // Universal File Import Handler
  const handleProcessImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImport(true);
    setImportStatus(`"${file.name}" fayli o'qilmoqda va tekshirilmoqda...`);

    setTimeout(() => {
      setIsProcessingImport(false);
      setImportStatus(`✅ Muvaffaqiyatli! 135 ta yozuv (${importTarget}) Tradeuz SFA tizimiga yuklandi!`);
      showToast(`Excel ma'lumotlari yuklandi (${file.name})`);
    }, 1200);
  };

  // Primary SFA Modules matching exact app.tradeuz.uz navigation structure
  const sfaModules = [
    {
      id: 'analytics',
      label: 'Аналитика',
      icon: TrendingUp,
      defaultTab: 'dashboard',
      subItems: [
        { id: 'dashboard', label: 'Tahliliy Dashbord', icon: TrendingUp },
        { id: 'linko_report', label: 'Конструктор Отчетов (Linko SFA)', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'clients',
      label: 'Клиенты',
      icon: Users,
      defaultTab: 'clients',
      subItems: [
        { id: 'clients', label: 'Mijozlar Bazasi (CRM)', icon: Users },
        { id: 'territories', label: 'Teritoriyalar (Hududlar)', icon: MapPin },
        { id: 'akt_sverka', label: 'Akt Sverka (Solishtirma)', icon: FileText },
        { id: 'promotions', label: 'Aksiya va Chegirmalar', icon: Tag },
      ],
    },
    {
      id: 'sales',
      label: 'Продажи',
      icon: ShoppingBag,
      defaultTab: 'orders',
      subItems: [
        { id: 'orders', label: 'Buyurtmalar va Savdo', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'staff',
      label: 'Персонал',
      icon: UserCheck,
      defaultTab: 'staff',
      subItems: [
        { id: 'staff', label: 'Xodimlar va Agentlar', icon: UserCheck },
        { id: 'delivery', label: 'Kuryerlar va GPS', icon: Truck },
      ],
    },
    {
      id: 'warehouse',
      label: 'Склад',
      icon: Building2,
      defaultTab: 'products',
      subItems: [
        { id: 'products', label: 'Mahsulotlar Katalogi', icon: Package },
        { id: 'prices', label: 'Narxlar va Narxlash (Multi-Price)', icon: Tag },
        { id: 'prixod', label: 'Prixod (Kirim)', icon: ArrowDownLeft },
        { id: 'spisat', label: 'Spisat (Chiqim)', icon: ArrowUpRight },
        { id: 'inventarizatsiya', label: 'Inventarizatsiya', icon: ClipboardCheck },
        { id: 'ostatka', label: 'Ombor Qoldiqlari (Ostatka)', icon: Layers },
      ],
    },
    {
      id: 'finance',
      label: 'Финансы',
      icon: Wallet,
      defaultTab: 'payments',
      subItems: [
        { id: 'payments', label: 'Kassa va To\'lovlar', icon: Wallet },
      ],
    },
    {
      id: 'integrations',
      label: 'Интеграции & Настройки',
      icon: Globe,
      defaultTab: 'regos_integration',
      subItems: [
        { id: 'regos_integration', label: 'Regos.online Integratsiya', icon: Globe },
        { id: 'import_templates', label: 'Import Shablonlari (Excel/CSV)', icon: Download },
        { id: 'ai', label: 'AI Operator va Tahlil', icon: Sparkles },
        { id: 'settings', label: 'Tizim Sozlamalari (Limiting)', icon: Sliders },
        { id: 'security', label: 'Xavfsizlik va Audit', icon: ShieldCheck },
      ],
    },
  ];

  // Determine active main module
  const currentModule =
    sfaModules.find((m) => m.subItems.some((sub) => sub.id === activeTab)) || sfaModules[4];

  // Active Tab Title in Tradeuz breadcrumb style
  const activeSubItem = currentModule.subItems.find((sub) => sub.id === activeTab);
  const breadcrumbTitle = activeSubItem ? activeSubItem.label : 'Продукты';
  const isCurrentStarred = starredModules.includes(activeTab);

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-slate-800 flex flex-col font-sans text-xs selection:bg-indigo-500 selection:text-white relative">
      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-700 shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP NAV BAR — Exact Tradeuz Navy Color (#24275f) */}
      <header className="bg-[#24275f] text-white px-3 py-1.5 flex items-center justify-between sticky top-0 z-40 shadow-md h-12">
        {/* Left Side: Logo & Workspace Selector */}
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex items-center gap-1.5 hover:bg-[#1b1e4c] px-2 py-1 rounded transition-colors"
          >
            <span className="font-extrabold text-base tracking-tight text-white font-mono">
              tradeuz
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
          </button>

          {/* Workspace Dropdown */}
          {isWorkspaceDropdownOpen && (
            <div className="absolute top-10 left-0 bg-[#1c1e4c] border border-indigo-900/80 rounded-xl shadow-2xl p-2 w-56 z-50 text-xs space-y-1">
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider px-2 py-1">
                Tizim ish zonalari:
              </div>
              {['Tradeuz Distributsiya', 'Tradeuz Supermarket Retail', 'Tradeuz Horeca B2B', 'Tradeuz Farmatsevtika'].map(
                (ws) => (
                  <button
                    key={ws}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setIsWorkspaceDropdownOpen(false);
                      showToast(`Ish zonasi o'zgartirildi: ${ws}`);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      activeWorkspace === ws ? 'bg-indigo-600 text-white font-bold' : 'text-indigo-200 hover:bg-indigo-900/50'
                    }`}
                  >
                    <span>{ws}</span>
                    {activeWorkspace === ws && <Check className="w-3.5 h-3.5" />}
                  </button>
                )
              )}
            </div>
          )}

          <div className="h-4 w-px bg-indigo-800/80 hidden sm:block"></div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-indigo-200">
            <span className="font-semibold">{activeWorkspace}</span>
          </div>
        </div>

        {/* Center: Main Navigation Icons & Labels */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar mx-2">
          {sfaModules.map((mod) => {
            const Icon = mod.icon;
            const isModuleActive = mod.subItems.some((sub) => sub.id === activeTab);

            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.defaultTab)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all whitespace-nowrap text-[12px] font-medium ${
                  isModuleActive
                    ? 'bg-[#1b1e4c] text-white font-bold shadow-sm'
                    : 'text-indigo-200 hover:text-white hover:bg-[#1f2254]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isModuleActive ? 'text-sky-400' : 'text-indigo-300'}`} />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side: Telegram Switcher, Bell, Settings, User & Branch */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSelector variant="compact" />
          <button
            onClick={onOpenTelegram}
            className="hidden md:flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded transition-all shadow-sm"
            title="Telegram Client va Agent App ko'rinishiga o'tish"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Mijoz & Agent App</span>
          </button>

          {/* Bell Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 text-indigo-200 hover:text-white rounded hover:bg-[#1c1e4c] transition-colors relative"
              title="Xabarlar va Tizim Bildirishnomalari"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1 right-1 animate-ping"></span>
              <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1 right-1"></span>
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-10 bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl shadow-2xl p-4 w-80 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-sky-400" />
                    <span>Tizim Bildirishnomalari</span>
                  </h4>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-rose-400 font-bold text-[11px]">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Nasiya Muddati
                      </span>
                      <span className="text-[9px] font-mono">10 daq avval</span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      3 ta do'konda (Safat Savdo, Chilonzor Market) 14,200,000 UZS nasiya to'lov muddati o'tdi.
                    </p>
                  </div>

                  <div className="bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-sky-400 font-bold text-[11px]">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> Yangi Ulgurji Buyurtma
                      </span>
                      <span className="text-[9px] font-mono">25 daq avval</span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Buyurtma #ORD-892 (Аристократ 0.33l x 50 blok) Agent Otabek tomonidan kiritildi.
                    </p>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" /> Ombor Min Qoldiq
                      </span>
                      <span className="text-[9px] font-mono">1 soat avval</span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Toshkent Omborida "Мохито 0.25l Клубника" miqdori 40 tadan kam qoldi.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    showToast("Barcha bildirishnomalar o'qilgan deb belgilandi");
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded-xl text-[11px] transition-colors"
                >
                  Barchasini o'qilgan deb belgilash
                </button>
              </div>
            )}
          </div>

          {/* Settings Icon */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-1.5 text-indigo-200 hover:text-white rounded hover:bg-[#1c1e4c] transition-colors"
            title="Tizim Sozlamalari"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-indigo-800/80 hidden sm:block"></div>

          {/* User Profile Info */}
          <button
            onClick={() => setIsUserProfileOpen(true)}
            className="flex items-center gap-1.5 hover:bg-[#1c1e4c] px-2 py-1 rounded transition-colors"
            title="Administrator Profili"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-800 text-white font-bold text-[10px] flex items-center justify-center border border-indigo-600">
              A
            </div>
            <span className="text-[11px] font-medium text-white hidden xl:inline">Admin (Tradeuz)</span>
          </button>
        </div>
      </header>

      {/* 2. SECONDARY SUB-MODULE BAR (Level 2 Sub-Items) */}
      {currentModule.subItems.length > 1 && (
        <div className="bg-[#1f2152] text-indigo-200 border-b border-indigo-900/60 px-4 py-1 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider font-mono mr-1">
            {currentModule.label}:
          </span>
          {currentModule.subItems.map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = activeTab === sub.id;

            return (
              <button
                key={sub.id}
                onClick={() => setActiveTab(sub.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  isSubActive
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'text-indigo-200 hover:text-white hover:bg-indigo-900/60'
                }`}
              >
                <SubIcon className="w-3 h-3" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. TRADEUZ TOOLBAR BAR (Light header with Star, Title, and Action Buttons) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Left: Star & Breadcrumb Title */}
        <div className="flex items-center gap-2 text-slate-700">
          <button
            onClick={() => toggleStarModule(activeTab)}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
            title={isCurrentStarred ? 'Izbranniydan olib tashlash' : 'Izbranniyga qo\'shish'}
          >
            <Star
              className={`w-4 h-4 transition-colors ${
                isCurrentStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-400 hover:text-amber-400'
              }`}
            />
          </button>
          <span className="text-slate-500 font-normal text-xs">Избранные</span>
          <span className="text-slate-300">|</span>
          <h1 className="text-sm font-bold text-slate-900">{breadcrumbTitle}</h1>
        </div>

        {/* Right Action Buttons matching app.tradeuz.uz pill buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[#3b82f6] hover:bg-blue-600 text-white font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Импортировать</span>
          </button>

          <button
            onClick={() => setIsBatchUpdateModalOpen(true)}
            className="bg-[#3b82f6] hover:bg-blue-600 text-white font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Обновить с excel</span>
          </button>

          <button
            onClick={handleUniversalAdd}
            className="bg-[#22c55e] hover:bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* Main Full-Width Content Container */}
      <main className="flex-1 p-2 sm:p-3 overflow-y-auto custom-scrollbar space-y-3 bg-slate-100/90">{children}</main>

      {/* MODAL 1: IMPORT EXCEL / CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Excel/CSV Ma'lumotlarni Tizimga Import Qilish</span>
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold text-xs">Import ob'ektini tanlang:</label>
                <select
                  value={importTarget}
                  onChange={(e) => setImportTarget(e.target.value as any)}
                  className="w-full bg-slate-50 text-slate-800 p-2 rounded-lg border border-slate-300 font-medium"
                >
                  <option value="products">🛒 Mahsulotlar Kataloqi (SKU, Shtrix-kod, Narxlar)</option>
                  <option value="clients">🏪 B2B Do'konlar & Mijozlar Bazasi</option>
                  <option value="orders">📋 Arxiv Buyurtmalar & Nakladnoylar</option>
                </select>
              </div>

              {/* Drag & Drop File Input */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center space-y-2 bg-slate-50/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleProcessImportFile}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-8 h-8 text-blue-500 mx-auto" />
                <div className="font-bold text-slate-700 text-xs">Excel yoki CSV faylni shuyerga tashlang</div>
                <div className="text-[11px] text-slate-400">qo'llab-quvvatlanadi: .xlsx, .xls, .csv (maksimal 25MB)</div>
              </div>

              {isProcessingImport && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold animate-pulse flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{importStatus}</span>
                </div>
              )}

              {importStatus && !isProcessingImport && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                  {importStatus}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  showToast('Test excel shabloni yuklab olindi');
                }}
                className="text-blue-600 hover:underline text-[11px] font-semibold"
              >
                📥 Namuna Excel Shabloni (.XLSX)
              </a>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH UPDATE VIA EXCEL */}
      {isBatchUpdateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Excel Orqali Narxlar va Ombor Qoldiqlarini Ommaviy Yangilash</span>
              </h3>
              <button onClick={() => setIsBatchUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 text-xs">
              Shtrix-kod yoki SKU bo'yicha mahsulot sotish narxi, tan narxi hamda ombor qoldiqlarini bir vaqtning o'zida avtomatik yangilang.
            </p>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center space-y-2 bg-slate-50/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  showToast('Yangilanish fayli qabul qilindi. 135 ta mahsulot narxi va qoldig\'i yangilandi!');
                  setIsBatchUpdateModalOpen(false);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-bold text-slate-700 text-xs">Yangilanish faylini tanlang (.xlsx)</div>
              <div className="text-[11px] text-slate-400">Ustunlar: SKU | Shtrix-kod | Yangi Narx | Yangi Qoldiq</div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsBatchUpdateModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-1.5 rounded-lg transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SYSTEM & STORE SETTINGS */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Supermarket & ERP Tizim Sozlamalari</span>
              </h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Do'kon Nomi section */}
              <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl space-y-3">
                <h4 className="font-extrabold text-sky-950 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span>Do'kon / Supermarket Nomi Sozlamalari</span>
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-slate-700 block mb-1 font-semibold">Supermarket / Do'kon Nomi:</label>
                    <input
                      type="text"
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                      placeholder="Masalan: OSIYO SUPERMARKET"
                      className="w-full bg-white p-2.5 rounded-lg border border-slate-300 font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Belgi / Badge:</label>
                    <input
                      type="text"
                      value={storeBadgeInput}
                      onChange={(e) => setStoreBadgeInput(e.target.value)}
                      placeholder="Masalan: GO"
                      className="w-full bg-white p-2.5 rounded-lg border border-slate-300 font-bold text-slate-900 focus:border-sky-500 focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Security PINs section */}
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl space-y-3">
                <h4 className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                  <LockIcon className="w-4 h-4 text-amber-600" />
                  <span>Maxfiy Kirish Parollari (PIN)</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">ERP Admin PIN kodi:</label>
                    <input
                      type="text"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      placeholder="7230"
                      className="w-full bg-white p-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-center"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Agent Paneli PIN kodi:</label>
                    <input
                      type="text"
                      value={agentPinInput}
                      onChange={(e) => setAgentPinInput(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-white p-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Direct Access Link Note */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">💡 Maxfiy Havolalar orqali kiring:</p>
                <p className="font-mono text-[10px] text-sky-700">● Admin havola: ?mode=admin</p>
                <p className="font-mono text-[10px] text-amber-700">● Agent havola: ?mode=agent</p>
                <p className="text-[10px] text-slate-500 italic">Mijoz Mini App-da logo ustiga 5 marta ketma-ket bosilganda ham PIN soraladi.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Yopish
              </button>
              <button
                onClick={() => {
                  const updated = saveStoreSettings({
                    storeName: storeNameInput.trim() || 'OSIYO SUPERMARKET',
                    storeBadge: storeBadgeInput.trim() || 'GO',
                    adminPin: adminPinInput.trim() || '7230',
                    agentPin: agentPinInput.trim() || '1234',
                  });
                  setStoreSettings(updated);
                  setIsSettingsModalOpen(false);
                  showToast('✅ Do\'kon nomi va parollar muvaffaqiyatli saqlandi!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-xs"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: USER PROFILE & ROLE SWITCHER */}
      {isUserProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Foydalanuvchi Profili</span>
              </h3>
              <button onClick={() => setIsUserProfileOpen(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-indigo-900 text-white font-black text-xl flex items-center justify-center mx-auto border-2 border-indigo-500 shadow-md">
                S
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Shoaziz Rahimov</h4>
                <p className="text-[11px] text-slate-500">shoaziz@tradeuz.uz — Bosh Direktor</p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <label className="text-slate-600 block font-semibold">Aktiv Rolni Tanlash:</label>
              <select
                value={activeRole}
                onChange={(e) => {
                  setActiveRole(e.target.value as any);
                  showToast(`Rol o'zgartirildi: ${e.target.value}`);
                }}
                className="w-full bg-slate-50 p-2 rounded-lg border border-slate-300 font-bold text-slate-800"
              >
                <option value="super_admin">👑 Super Admin (Barcha Huquqlar)</option>
                <option value="branch_manager">🏢 Filial Menejeri</option>
                <option value="cashier">💰 Kassa Operator</option>
                <option value="sales_rep">👨‍💼 Savdo Vakili (Agent)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsUserProfileOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg"
              >
                Tushnarli
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
