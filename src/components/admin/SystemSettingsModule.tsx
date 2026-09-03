import React, { useState, useEffect } from 'react';
import {
  Sliders,
  MapPin,
  ShoppingCart,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  Save,
  Info,
  Trash2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Truck,
  Gift,
  CreditCard,
  Plus,
  Edit2,
  Bot,
  Zap,
  BellRing,
  Send,
  Radio,
  AlertCircle,
  ExternalLink,
  Store,
  KeyRound,
  Phone,
} from 'lucide-react';
import { SystemSettings, CustomPaymentMethod, DualBotConfig } from '../../types';
import {
  fetchSettings,
  updateSettings,
  resetDatabaseExceptProducts,
  fetchDualBotConfig,
  saveDualBotConfig,
  triggerDualBotSync,
} from '../../services/api';
import { IMPORT_TEMPLATES, downloadTemplateById } from '../../utils/templateUtils';
import { saveStoreSettings, getStoreSettings } from '../../utils/storeSettings';

export const SystemSettingsModule: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    minOrderAmountClient: 50000,
    minOrderAmountAgent: 200000,
    isGeolocationRequiredForClient: true,
    deliveryFeeType: 'fixed',
    deliveryFeeAmount: 10000,
    deliveryFeeExpressAmount: 15000,
    freeDeliveryThreshold: 100000,
  });
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dual Bot States
  const [dualBotConfig, setDualBotConfig] = useState<DualBotConfig>({
    salesBotToken: '8732452657:AAFzmcCvC7OvKSSQZKQOJDJgS2yfpgjznkQ',
    syncBotToken: '8382001690:AAE_sDNAayFQpTXMV4k9GPgvd7xa6N0rf2I',
    adminId: '7230016421',
    customWebAppUrl: '',
    sourceBotUsername: '@Botbazaos_bot',
    autoSyncIntervalMinutes: 15,
    autoUpdateVariants: true,
    notifyOnNewProduct: true,
    notifyOnPriceChange: true,
  });
  const [isTestingSalesBot, setIsTestingSalesBot] = useState(false);
  const [isTestingSyncBot, setIsTestingSyncBot] = useState(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);
  const [botToast, setBotToast] = useState<string | null>(null);
  
  // Database Reset States
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Payment Methods Modal States
  const [showPmModal, setShowPmModal] = useState(false);
  const [editingPm, setEditingPm] = useState<CustomPaymentMethod | null>(null);
  const [pmForm, setPmForm] = useState<Partial<CustomPaymentMethod>>({
    name: '',
    code: '',
    icon: '💳',
    description: '',
    enabled: true,
  });

  useEffect(() => {
    loadSettings();
    loadDualBotConfig();
  }, []);

  const loadDualBotConfig = async () => {
    try {
      const data = await fetchDualBotConfig();
      setDualBotConfig((prev) => ({ ...prev, ...data }));
    } catch (e) {
      console.error('Error fetching dual bot config:', e);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      const localStore = getStoreSettings();
      const merged: SystemSettings = {
        ...data,
        storeName: data.storeName || localStore.storeName || 'OSIYO SUPERMARKET',
        storeBadge: data.storeBadge || localStore.storeBadge || 'GO',
        adminPin: data.adminPin || localStore.adminPin || '7230',
        agentPin: data.agentPin || localStore.agentPin || '1234',
        adminPhone: data.adminPhone || localStore.adminPhone || '+998 90 123 45 67',
      };
      setSettings(merged);
      if (data.storeName || data.adminPin) {
        saveStoreSettings({
          storeName: merged.storeName || 'OSIYO SUPERMARKET',
          storeBadge: merged.storeBadge || 'GO',
          adminPin: merged.adminPin || '7230',
          agentPin: merged.agentPin || '1234',
          adminPhone: merged.adminPhone,
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDualBot = async () => {
    try {
      await saveDualBotConfig(dualBotConfig);
      setBotToast("✅ 2 ta Telegram Bot sozlamalari muvaffaqiyatli saqlandi!");
      setTimeout(() => setBotToast(null), 3500);
    } catch (e) {
      setBotToast("❌ Bot sozlamalarini saqlashda xatolik!");
      setTimeout(() => setBotToast(null), 3500);
    }
  };

  const handleTestSalesBot = async () => {
    setIsTestingSalesBot(true);
    try {
      const res = await fetch('/api/telegram/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botType: 'Savdo Boti',
          message: `🔔 <b>SAVDO BOTI SINOVI (Bot 1)</b>\n\nAdmin ID (<code>${dualBotConfig.adminId}</code>) bilan ulanish aloqasi mukammal ishlayapti!\n\n🛒 Yangi buyurtmalar, to'lovlar va bildirishnomalar ushbu bot orqali yetkaziladi.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBotToast("✅ Savdo botidan test xabari yuborildi!");
      } else {
        setBotToast("❌ Xabar yuborishda xatolik! Token yoki Admin ID ni tekshiring.");
      }
    } catch (e) {
      setBotToast("❌ Tarmoq xatosi!");
    } finally {
      setIsTestingSalesBot(false);
      setTimeout(() => setBotToast(null), 3500);
    }
  };

  const handleTriggerSync = async () => {
    setIsTriggeringSync(true);
    try {
      const res = await triggerDualBotSync();
      setBotToast(res.message || "✅ Ko'chirma botidan sinxronlash bajarildi!");
    } catch (e) {
      setBotToast("❌ Sinxronlashda xatolik!");
    } finally {
      setIsTriggeringSync(false);
      setTimeout(() => setBotToast(null), 3500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      saveStoreSettings({
        storeName: updated.storeName || settings.storeName || 'OSIYO SUPERMARKET',
        storeBadge: updated.storeBadge || settings.storeBadge || 'GO',
        adminPin: updated.adminPin || settings.adminPin || '7230',
        agentPin: updated.agentPin || settings.agentPin || '1234',
        adminPhone: updated.adminPhone || settings.adminPhone,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert("Sozlamalarni saqlashda xatolik yuz berdi");
    }
  };

  const handleOpenAddPm = () => {
    setEditingPm(null);
    setPmForm({ name: '', code: '', icon: '💳', description: '', enabled: true });
    setShowPmModal(true);
  };

  const handleOpenEditPm = (pm: CustomPaymentMethod) => {
    setEditingPm(pm);
    setPmForm({ ...pm });
    setShowPmModal(true);
  };

  const handleSavePm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmForm.name || !pmForm.code) return;

    const currentList = settings.paymentMethods || [];
    let updatedList: CustomPaymentMethod[];

    if (editingPm) {
      updatedList = currentList.map((p) =>
        p.id === editingPm.id
          ? {
              ...p,
              name: pmForm.name || p.name,
              code: (pmForm.code || p.code).toLowerCase().replace(/\s+/g, '_'),
              icon: pmForm.icon || '💳',
              description: pmForm.description || '',
              enabled: pmForm.enabled !== false,
            }
          : p
      );
    } else {
      const newPm: CustomPaymentMethod = {
        id: `pm_${Date.now()}`,
        name: pmForm.name,
        code: pmForm.code.toLowerCase().replace(/\s+/g, '_'),
        icon: pmForm.icon || '💳',
        description: pmForm.description || '',
        enabled: pmForm.enabled !== false,
      };
      updatedList = [...currentList, newPm];
    }

    setSettings({ ...settings, paymentMethods: updatedList });
    setShowPmModal(false);
  };

  const handleDeletePm = (id: string) => {
    if (confirm("Ushbu to'lov turini o'chirishga ishonchingiz komilmi?")) {
      const updatedList = (settings.paymentMethods || []).filter((p) => p.id !== id);
      setSettings({ ...settings, paymentMethods: updatedList });
    }
  };

  const handleTogglePm = (id: string) => {
    const updatedList = (settings.paymentMethods || []).map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setSettings({ ...settings, paymentMethods: updatedList });
  };

  const handleExecuteDatabaseReset = async () => {
    try {
      setIsResetting(true);
      const result = await resetDatabaseExceptProducts();
      setShowResetConfirmModal(false);
      setResetMessage(result.message || "Mahsulotlardan tashqari barcha ma'lumotlar tozalandi!");
      setTimeout(() => setResetMessage(null), 5000);
    } catch (err) {
      console.error("Reset error:", err);
      alert("Ma'lumotlar omborini tozalashda xatolik yuz berdi");
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold animate-pulse text-xs">
        Sozlamalar yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs font-sans p-1 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Tizim Sozlamalari (Limitlar va Geolokatsiya)
            </h2>
            <p className="text-[11px] text-slate-500">
              Klientlar va Agentlar uchun minimal zakaz miqdorlarini va geolokatsiya majburiyligini boshqarish.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Muvaffaqiyatli saqlandi!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 0: Do'kon Nomi, Belgisi va Kirish PIN-kodlari */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span>Do'kon Nomi, Belgisi va Kirish PIN-kodlari</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold text-xs">
                🏢 Asosiy Do'kon Nomi:
              </label>
              <input
                type="text"
                value={settings.storeName || ''}
                placeholder="OSIYO SUPERMARKET"
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold text-xs">
                🏷️ Logotip Belgisi (Badge):
              </label>
              <input
                type="text"
                value={settings.storeBadge || ''}
                placeholder="GO"
                onChange={(e) => setSettings({ ...settings, storeBadge: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold text-xs flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin Kirish PIN-kodi:</span>
              </label>
              <input
                type="text"
                value={settings.adminPin || ''}
                placeholder="7230"
                maxLength={6}
                onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-xs tracking-widest focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-bold text-xs flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>Agent Kirish PIN-kodi:</span>
              </label>
              <input
                type="text"
                value={settings.agentPin || ''}
                placeholder="1234"
                maxLength={6}
                onChange={(e) => setSettings({ ...settings, agentPin: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-xs tracking-widest focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-slate-700 font-bold text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>Boshqaruvchi / Aloqa Telefoni:</span>
              </label>
              <input
                type="text"
                value={settings.adminPhone || ''}
                placeholder="+998 90 123 45 67"
                onChange={(e) => setSettings({ ...settings, adminPhone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Section 1: Minimal Order Amounts */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            <span>Minimal Zakaz Miqdori (Summasi) Limiti</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Limit */}
            <div className="bg-indigo-50/60 border border-indigo-200 p-4 rounded-2xl space-y-2">
              <label className="block text-indigo-950 font-extrabold text-xs">
                🛍️ Klientlar (Xaridorlar) uchun Minimal Zakaz Summasi (UZS):
              </label>
              <p className="text-[11px] text-slate-600">
                Mijoz ilovadan buyurtma berayotganda savatcha summasi ushbu miqdordan kam bo'lsa, xaridni tasdiqlay olmaydi.
              </p>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={settings.minOrderAmountClient}
                  onChange={(e) =>
                    setSettings({ ...settings, minOrderAmountClient: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-indigo-300 rounded-xl p-3 text-slate-900 font-mono font-extrabold text-sm focus:outline-none focus:border-indigo-600"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">UZS</span>
              </div>
            </div>

            {/* Agent Limit */}
            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-2">
              <label className="block text-amber-950 font-extrabold text-xs">
                💼 Agentlar (Savdo Vakillari) uchun Minimal Zakaz Summasi (UZS):
              </label>
              <p className="text-[11px] text-slate-600">
                Savdo agenti B2B mijoz do'koniga borib zakaz olayotganda ushbu minimal limitdan kam summa kirita olmaydi.
              </p>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  step={10000}
                  value={settings.minOrderAmountAgent}
                  onChange={(e) =>
                    setSettings({ ...settings, minOrderAmountAgent: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-amber-300 rounded-xl p-3 text-slate-900 font-mono font-extrabold text-sm focus:outline-none focus:border-amber-600"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">UZS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Delivery Fee & Free Delivery Settings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
            <Truck className="w-4 h-4 text-sky-600" />
            <span>Yetkazib Berish (Dostavka) Narxi va Bepul Dostavka Sozlamalari</span>
          </div>

          <p className="text-[11px] text-slate-500">
            Admin sifatida xohlasangiz yetkazib berishni <b>bepul</b> qilib qo'yishingiz, belgilangan narx xohlagancha qo'yishingiz yoki ma'lum bir xarid summasidan oshsa bepul bo'ladigan rejimni tanlashingiz mumkin.
          </p>

          {/* Delivery Fee Type Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, deliveryFeeType: 'free' })}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                (settings.deliveryFeeType || 'fixed') === 'free'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🆓</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  (settings.deliveryFeeType || 'fixed') === 'free' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  HAR DOIM BEPUL
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs">Bepul Yetkazib Berish</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Barcha buyurtmalar uchun dostavka summasi 0 UZS bo'ladi.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, deliveryFeeType: 'fixed' })}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                (settings.deliveryFeeType || 'fixed') === 'fixed'
                  ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-400/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">💵</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  (settings.deliveryFeeType || 'fixed') === 'fixed' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  BELGILANGAN PULLI
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs">Belgilangan Narx (Pulli)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Har bir buyurtmaga admin belgilagan summa qo'shiladi.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, deliveryFeeType: 'threshold_free' })}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                (settings.deliveryFeeType || 'fixed') === 'threshold_free'
                  ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🎁</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  (settings.deliveryFeeType || 'fixed') === 'threshold_free' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  SUMMAMIDAN BEPUL
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs">Aksiya: Summadan Bepul</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Masalan 100,000 UZS dan oshsa dostavka BEPUL bo'ladi.</p>
              </div>
            </button>
          </div>

          {/* Delivery Fee Amount Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">
                📦 Standart Dostavka Narxi (UZS):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={settings.deliveryFeeAmount ?? 10000}
                  onChange={(e) => setSettings({ ...settings, deliveryFeeAmount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-sky-600"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">UZS</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">
                🚀 Express (Tezkor) Dostavka Narxi (UZS):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={settings.deliveryFeeExpressAmount ?? 15000}
                  onChange={(e) => setSettings({ ...settings, deliveryFeeExpressAmount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-sky-600"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">UZS</span>
              </div>
            </div>

            <div>
              <label className="block text-purple-950 font-extrabold text-xs mb-1">
                🎁 Bepul bo'lish Minimal Summasi (UZS):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={settings.freeDeliveryThreshold ?? 100000}
                  onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })}
                  className="w-full bg-purple-50 border border-purple-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-purple-600"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">UZS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Geolocation Requirement */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Mijoz Buyurtmasida Geolokatsiya (GPS) Majburiyligi</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-xs">
                Buyurtma rasmiylashtirishda GPS joylashuvni aniqlashni majburiy qilish
              </h4>
              <p className="text-[11px] text-slate-500 max-w-lg">
                Agar bu funksiya **yoqilgan** bo'lsa, mijoz buyurtma berishdan oldin 'Mening joylashuvimni aniqlash' tugmasini bosib, GPS koordinatalarini yuborishi shart bo'ladi. Kuryer aniq yetkazib bera oladi.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-black ${settings.isGeolocationRequiredForClient ? 'text-emerald-700' : 'text-slate-400'}`}>
                {settings.isGeolocationRequiredForClient ? '🔴 MAJBURII' : '⚪ IXTIYORIY'}
              </span>

              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    isGeolocationRequiredForClient: !settings.isGeolocationRequiredForClient,
                  })
                }
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.isGeolocationRequiredForClient ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.isGeolocationRequiredForClient ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Checkout Notice & Terms */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
              <Info className="w-4 h-4 text-amber-500" />
              <span>Mijoz Buyurtma Eslatmasi va Shartlari</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${settings.checkoutNoticeEnabled !== false ? 'text-amber-600' : 'text-slate-400'}`}>
                {settings.checkoutNoticeEnabled !== false ? 'YOQILGAN' : 'O\'CHIRILGAN'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    checkoutNoticeEnabled: settings.checkoutNoticeEnabled === false ? true : false,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.checkoutNoticeEnabled !== false ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.checkoutNoticeEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Mijoz buyurtma rasmiylashtirish jarayonida ushbu eslatma va ixtiyoriy shartlarni o'qiydi hamda "Roziman" katagini belgilashi shart bo'ladi.
          </p>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 text-xs">
              Eslatma va Shartlar Matni (Admin xohlagancha o'zgartirishi mumkin):
            </label>
            <textarea
              rows={4}
              value={settings.checkoutNoticeText || ''}
              onChange={(e) => setSettings({ ...settings, checkoutNoticeText: e.target.value })}
              placeholder="Eslatmani kiriting..."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
        </div>

        {/* Section: Payment Methods Management */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
              <CreditCard className="w-4.5 h-4.5 text-blue-600" />
              <span>To'lov Turlarini Boshqarish (Payment Methods)</span>
            </div>

            <button
              type="button"
              onClick={handleOpenAddPm}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yangi To'lov Turi</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Mijozlar Telegram Mini App orqali buyurtma berayotganda tanlashi mumkin bo'lgan to'lov usullarini yaratish, tahrirlash, o'chirish yoki vaqtincha o'chirib qo'yish.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(settings.paymentMethods || []).map((pm) => (
              <div
                key={pm.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  pm.enabled !== false
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-100/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pm.icon}</span>
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>{pm.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-200/80 px-1.5 py-0.2 rounded">
                        {pm.code}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">{pm.description || 'Izohsiz'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePm(pm.id)}
                    className={`text-[10px] font-black px-2 py-1 rounded-lg border cursor-pointer ${
                      pm.enabled !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    {pm.enabled !== false ? 'AKTIV' : 'O\'CHIRILGAN'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditPm(pm)}
                    className="p-1.5 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePm(pm.id)}
                    className="p-1.5 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: 2 ta Telegram Bot Ulash (Savdo Boti va Ma'lumot / Ko'chirma Boti) */}
        <div className="bg-white p-5 rounded-3xl border border-indigo-200/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  2 ta Telegram Bot Tizimi (Savdo Boti + Ko'chirma / Ma'lumot Boti)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bot 1: Xaridlar va mijozlar buyurtmasi | Bot 2: Ta'minotchidan narx va tovar ko'chirish
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={isTriggeringSync}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringSync ? 'animate-spin' : ''}`} />
                <span>{isTriggeringSync ? 'Sinxronlanmoqda...' : "Ko'chirmani Tekshirish"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDualBot}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Botlarni Saqlash</span>
              </button>
            </div>
          </div>

          {botToast && (
            <div className="bg-indigo-50 border border-indigo-300 text-indigo-950 font-bold p-3 rounded-2xl text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{botToast}</span>
            </div>
          )}

          {/* Dual Bot Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BOT 1: SAVDO VA MIJOZ BOTI */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛒</span>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      1. Savdo va Buyurtmalar Boti (Bot 1)
                    </h4>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      Mijozlar xaridi va admin buyurtma signallari
                    </span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  AKTIV
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Telegram Bot Token (BotFather):
                  </label>
                  <input
                    type="text"
                    value={dualBotConfig.salesBotToken}
                    onChange={(e) =>
                      setDualBotConfig({ ...dualBotConfig, salesBotToken: e.target.value })
                    }
                    placeholder="8732452657:AAFzmcCvC7OvKSSQZKQOJDJgS2yfpgjznkQ"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Admin Telegram Chat ID:
                  </label>
                  <input
                    type="text"
                    value={dualBotConfig.adminId}
                    onChange={(e) =>
                      setDualBotConfig({ ...dualBotConfig, adminId: e.target.value })
                    }
                    placeholder="7230016421"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Maxsus WebApp URL (Ixtiyoriy):
                  </label>
                  <input
                    type="text"
                    value={dualBotConfig.customWebAppUrl || ''}
                    onChange={(e) =>
                      setDualBotConfig({ ...dualBotConfig, customWebAppUrl: e.target.value })
                    }
                    placeholder="https://ais-pre-gewlzhlqcvjtso52kwsiow-552952342062.asia-southeast1.run.app"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTestSalesBot}
                    disabled={isTestingSalesBot}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestingSalesBot ? 'Yuborilmoqda...' : 'Sinov Xabari Yuborish'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BOT 2: MA'LUMOT VA KO'CHIRMA BOTI */}
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📥</span>
                  <div>
                    <h4 className="font-extrabold text-xs text-amber-950">
                      2. Ma'lumot / Ko'chirma Boti (Bot 2)
                    </h4>
                    <span className="text-[10px] text-amber-700 font-bold">
                      Faqat ma'lumot oladi, narxni yangilaydi
                    </span>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                  KO'CHIRMA REJIMI
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Ko'chirma Boti Tokeni (yoki API):
                  </label>
                  <input
                    type="text"
                    value={dualBotConfig.syncBotToken || ''}
                    onChange={(e) =>
                      setDualBotConfig({ ...dualBotConfig, syncBotToken: e.target.value })
                    }
                    placeholder="Ta'minotchi boti tokeni yoki avto-parser"
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Manba Boti / Kanali Username:
                  </label>
                  <input
                    type="text"
                    value={dualBotConfig.sourceBotUsername || ''}
                    onChange={(e) =>
                      setDualBotConfig({ ...dualBotConfig, sourceBotUsername: e.target.value })
                    }
                    placeholder="@bondi_supplier_bot"
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Avto-tekshirish:
                    </label>
                    <select
                      value={dualBotConfig.autoSyncIntervalMinutes || 15}
                      onChange={(e) =>
                        setDualBotConfig({
                          ...dualBotConfig,
                          autoSyncIntervalMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-semibold focus:outline-none"
                    >
                      <option value={5}>Har 5 daqiqada</option>
                      <option value={15}>Har 15 daqiqada</option>
                      <option value={30}>Har 30 daqiqada</option>
                      <option value={60}>Har 1 soatda</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={handleTriggerSync}
                      disabled={isTriggeringSync}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Sinxronlash</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logic & Security Rules Checklist */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <h5 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Avtomatlashtirish va Xavfsizlik Qoidalari:</span>
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dualBotConfig.autoUpdateVariants !== false}
                  onChange={(e) =>
                    setDualBotConfig({ ...dualBotConfig, autoUpdateVariants: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="font-extrabold text-slate-900">
                    ⚡ Tip narxi o'zgarsa barcha assortimentlarni yangilash
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Masalan: <b>DENA 1L</b> narxi o'zgarsa, tizimda olma, shaftoli, gilos va barcha ta'mlari avtomatik yangilanadi.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 bg-white rounded-xl border border-amber-200 bg-amber-50/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dualBotConfig.notifyOnNewProduct !== false}
                  onChange={(e) =>
                    setDualBotConfig({ ...dualBotConfig, notifyOnNewProduct: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-600 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="font-extrabold text-amber-950">
                    🛡️ Yangi mahsulot qo'shilmasin, faqat Adminga bildirishnoma kelsin
                  </div>
                  <div className="text-[10px] text-amber-800">
                    Ko'chirma botida yangi tovar chiqsa katalogga kiritilmaydi, Admin Telegram botiga tasdiqlash uchun xabar boradi.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Download Import Templates Center */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
              <FileSpreadsheet className="w-4.5 h-4.5 text-teal-600" />
              <span>Import Shablonlari Markazi (Excel & CSV)</span>
            </div>
            <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold font-mono px-2.5 py-1 rounded-lg border border-teal-200">
              UTF-8 (BOM) CSV
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Katalog va ERP ma'lumotlarini ommaviy yuklash uchun barcha tayyor shablonlarni ushbu tugmalar orqali yuklab olishingiz mumkin:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {IMPORT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => downloadTemplateById(tpl.id)}
                className="bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 p-3 rounded-2xl flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{tpl.icon}</span>
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs group-hover:text-teal-700">
                      {tpl.titleUz}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{tpl.filenameXls}</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Section 5: Clear Database Except Products */}
        <div className="bg-rose-50/50 p-5 rounded-3xl border border-rose-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-rose-950">
              <Trash2 className="w-4.5 h-4.5 text-rose-600" />
              <span>Ma'lumotlar Omborini Tozalash (Mahsulotlardan Tashqari)</span>
            </div>
            <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2.5 py-0.5 rounded-full">
              ADMIN TIZIMI
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Eslatma: Mahsulotlar (Katalog) va kategoriyalarni <b>saqlab qolgan holda</b>, barcha sinov buyurtmalari, B2B mijozlar, to'lovlar, POS tushumlari va tarixiy jurnallarni tozalash:
          </p>

          {resetMessage && (
            <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold p-3 rounded-2xl text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Mahsulotlardan Tashqari Barcha Ma'lumotlarni Tozalash</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Sozlamalarni Saqlash</span>
          </button>
        </div>
      </form>

      {/* MODAL: RESET DATABASE CONFIRMATION */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-rose-200 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-base">
                Ma'lumotlar Ombori Tozalansinmi?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ushbu amal bajarilgach, <b>Mahsulotlar va Kategoriyalar saqlanadi</b>, lekin barcha Buyurtmalar, B2B Mijozlar, To'lovlar va POS Cheklar butunlay tozalanadi.
              </p>
            </div>

            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-[11px] text-rose-900 font-bold">
              ⚠️ Ushbu amal qaytarilmaydi! Tasdiqlaysizmi?
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs"
              >
                Bekor Qilish
              </button>

              <button
                type="button"
                disabled={isResetting}
                onClick={handleExecuteDatabaseReset}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-1.5"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Tozalanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ha, Tozalash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT PAYMENT METHOD */}
      {showPmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-blue-600" />
              <span>{editingPm ? "To'lov Turini Tahrirlash" : "Yangi To'lov Turini Qo'shish"}</span>
            </h3>

            <form onSubmit={handleSavePm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">To'lov Turi Nomi *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Uzum Pay, Anorbank, Click..."
                  value={pmForm.name || ''}
                  onChange={(e) => setPmForm({ ...pmForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kodu / Identifikatosi *</label>
                  <input
                    type="text"
                    required
                    placeholder="click, uzum, paynet"
                    value={pmForm.code || ''}
                    onChange={(e) => setPmForm({ ...pmForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ikonka (Emoji) *</label>
                  <input
                    type="text"
                    required
                    placeholder="📱, 💳, 💵, 🍇"
                    value={pmForm.icon || ''}
                    onChange={(e) => setPmForm({ ...pmForm, icon: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Qisqa Tavsif / Izoh</label>
                <input
                  type="text"
                  placeholder="Onlayn to'lov, kuryerga naqd berish..."
                  value={pmForm.description || ''}
                  onChange={(e) => setPmForm({ ...pmForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pmEnabledCheck"
                  checked={pmForm.enabled !== false}
                  onChange={(e) => setPmForm({ ...pmForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="pmEnabledCheck" className="text-slate-800 font-bold cursor-pointer">
                  Ushbu to'lov turi aktiv bo'lsin (Mijozga ko'rinsin)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPmModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

