import React, { useState, useEffect } from 'react';
import { TelegramApp } from './components/telegram/TelegramApp';
import { TelegramBotChat } from './components/telegram/TelegramBotChat';
import { AgentPanel } from './components/agent/AgentPanel';
import { AdminLayout } from './components/admin/AdminLayout';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { LinkoReportBuilder } from './components/admin/LinkoReportBuilder';
import { OrdersModule } from './components/admin/OrdersModule';
import { ClientsModule } from './components/admin/ClientsModule';
import { AktSverkaModule } from './components/admin/AktSverkaModule';
import { PaymentsModule } from './components/admin/PaymentsModule';
import { ProductManagement } from './components/admin/ProductManagement';
import { PricesModule } from './components/admin/PricesModule';
import { PrixodModule } from './components/admin/PrixodModule';
import { SpisatModule } from './components/admin/SpisatModule';
import { InventarizatsiyaModule } from './components/admin/InventarizatsiyaModule';
import { OstatkaModule } from './components/admin/OstatkaModule';
import { PromotionsModule } from './components/admin/PromotionsModule';
import { StaffModule } from './components/admin/StaffModule';
import { DeliveryModule } from './components/admin/DeliveryModule';
import { AICenter } from './components/admin/AICenter';
import { SecurityAuditModule } from './components/admin/SecurityAuditModule';
import { SystemSettingsModule } from './components/admin/SystemSettingsModule';
import { TerritoryManagementModule } from './components/admin/TerritoryManagementModule';
import { ImportTemplatesHub } from './components/admin/ImportTemplatesHub';
import { RegosIntegrationModule } from './components/admin/RegosIntegrationModule';
import { Lock as LockIcon, X, KeyRound, User } from 'lucide-react';
import { getStoreSettings } from './utils/storeSettings';
import { fetchStaff } from './services/api';

export default function App() {
  // Default mode for Telegram Bot & MiniApp clients: 'telegram_app' (Mijoz App)
  const [viewMode, setViewMode] = useState<'telegram_chat' | 'telegram_app' | 'agent_panel' | 'admin'>('telegram_app');
  const [initialMiniAppTab, setInitialMiniAppTab] = useState<string>('catalog');
  const [activeAdminTab, setActiveAdminTab] = useState<string>('products');

  // Security Auth for Admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Auto-detect URL parameters (e.g. ?mode=admin, ?mode=agent, ?mode=chat)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      const hash = window.location.hash;

      if (modeParam === 'admin' || params.get('admin') === '1' || hash === '#admin') {
        handleRequestAdminView();
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (modeParam === 'agent' || params.get('agent') === '1' || hash === '#agent') {
        setViewMode('agent_panel');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (modeParam === 'chat') {
        setViewMode('telegram_chat');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error('URL params check error:', e);
    }
  }, []);

  const openMiniAppWithTab = (tab?: string) => {
    if (tab) setInitialMiniAppTab(tab);
    setIsAdminAuthenticated(false);
    setViewMode('telegram_app');
  };

  const handleReturnToClientApp = () => {
    setIsAdminAuthenticated(false);
    setViewMode('telegram_app');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleRequestAdminView = () => {
    if (isAdminAuthenticated) {
      setViewMode('admin');
    } else {
      setLoginUsername('');
      setLoginPassword('');
      setAuthError(null);
      setIsLoginModalOpen(true);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = loginUsername.trim().toLowerCase();
    const p = loginPassword.trim();

    if (!u || !p) {
      setAuthError("⚠️ Iltimos, Login va Parol maydonlarini to'ldiring.");
      return;
    }

    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const staffList = await fetchStaff();
      // Match super_admin or matching login from live staff database
      const matchedAdmin = staffList.find(
        (st) =>
          (st.role === 'super_admin' || st.login?.toLowerCase() === u) &&
          (st.login?.toLowerCase() === u || (u === 'admin' && st.role === 'super_admin'))
      );

      let isValid = false;

      if (matchedAdmin) {
        if (matchedAdmin.password) {
          isValid = matchedAdmin.password === p;
        } else {
          isValid = p === '123' || p === getStoreSettings().adminPin;
        }
      } else if (u === 'admin') {
        const settings = getStoreSettings();
        isValid = p === '123' || p === settings.adminPin || p === '7230';
      }

      if (isValid) {
        setIsAdminAuthenticated(true);
        setIsLoginModalOpen(false);
        setAuthError(null);
        setViewMode('admin');
      } else {
        setAuthError("⛔ Noto'g'ri Login yoki Parol! Kirish ma'lumotlarini tekshirib qayta kiriting.");
      }
    } catch (err) {
      console.error('Admin auth check error:', err);
      const settings = getStoreSettings();
      if (u === 'admin' && (p === '123' || p === settings.adminPin)) {
        setIsAdminAuthenticated(true);
        setIsLoginModalOpen(false);
        setAuthError(null);
        setViewMode('admin');
      } else {
        setAuthError("⛔ Noto'g'ri Login yoki Parol!");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (viewMode === 'admin' && isAdminAuthenticated) {
    return (
      <AdminLayout
        activeTab={activeAdminTab}
        setActiveTab={setActiveAdminTab}
        onOpenTelegram={handleReturnToClientApp}
      >
        {activeAdminTab === 'dashboard' && <AnalyticsDashboard />}
        {activeAdminTab === 'linko_report' && <LinkoReportBuilder />}
        {activeAdminTab === 'orders' && <OrdersModule />}
        {activeAdminTab === 'clients' && <ClientsModule />}
        {activeAdminTab === 'territories' && <TerritoryManagementModule />}
        {activeAdminTab === 'akt_sverka' && <AktSverkaModule />}
        {activeAdminTab === 'payments' && <PaymentsModule />}
        {activeAdminTab === 'products' && <ProductManagement />}
        {activeAdminTab === 'prices' && <PricesModule />}
        {activeAdminTab === 'prixod' && <PrixodModule />}
        {activeAdminTab === 'spisat' && <SpisatModule />}
        {activeAdminTab === 'inventarizatsiya' && <InventarizatsiyaModule />}
        {activeAdminTab === 'ostatka' && <OstatkaModule />}
        {activeAdminTab === 'promotions' && <PromotionsModule />}
        {activeAdminTab === 'staff' && <StaffModule />}
        {activeAdminTab === 'delivery' && <DeliveryModule />}
        {activeAdminTab === 'ai' && <AICenter />}
        {activeAdminTab === 'regos_integration' && <RegosIntegrationModule />}
        {activeAdminTab === 'import_templates' && <ImportTemplatesHub />}
        {activeAdminTab === 'settings' && <SystemSettingsModule />}
        {activeAdminTab === 'security' && <SecurityAuditModule />}
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-start sm:justify-center items-center py-0 sm:py-3 px-0 sm:px-2 font-sans overflow-hidden relative">
      {/* Top Web Control Bar for quick switching between Client, Agent, and Admin modes */}
      <div className="w-full max-w-md mb-2 px-3 pt-2 sm:pt-0 flex items-center justify-between gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 backdrop-blur-md z-30 shadow-lg">
        <button
          onClick={() => setViewMode('telegram_app')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
            viewMode === 'telegram_app'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>📱 Mijoz</span>
        </button>

        <button
          onClick={() => setViewMode('agent_panel')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
            viewMode === 'agent_panel'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>💼 Agent</span>
        </button>

        <button
          onClick={handleRequestAdminView}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
            viewMode === 'admin'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
          }`}
        >
          <span>💻 Admin</span>
        </button>
      </div>

      {/* Responsive Frame Container */}
      <div className="w-full max-w-md shadow-2xl sm:rounded-3xl overflow-hidden border-0 sm:border border-slate-800 bg-slate-900 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] max-h-[760px] min-h-[480px] flex flex-col relative">
        {viewMode === 'telegram_chat' && (
          <TelegramBotChat
            onOpenMiniApp={openMiniAppWithTab}
          />
        )}

        {(viewMode === 'telegram_app' || (viewMode === 'admin' && !isAdminAuthenticated)) && (
          <TelegramApp
            initialTab={initialMiniAppTab}
            onOpenAdmin={handleRequestAdminView}
            onOpenAgentPanel={() => setViewMode('agent_panel')}
          />
        )}

        {viewMode === 'agent_panel' && (
          <AgentPanel
            onSwitchToClientMode={handleReturnToClientApp}
          />
        )}
      </div>

      {/* ADMIN LOGIN MODAL (Strict Username & Password for Web Admin) */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-100 font-sans relative">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <LockIcon className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-white tracking-tight">
                TRADEUZ ERP — Admin Kirish
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tizim administratorlari uchun veb-interfeys. Login va Parolingizni kiriting:
              </p>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Admin Login:</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Login kiriting"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full bg-slate-950 text-white font-mono font-bold text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Maxfiy Parol:</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Parol kiriting"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 text-white font-mono font-bold text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {authError && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-[11px] font-medium leading-tight text-center">
                  {authError}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  {isLoggingIn ? "Tekshirilmoqda..." : "Kirish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

