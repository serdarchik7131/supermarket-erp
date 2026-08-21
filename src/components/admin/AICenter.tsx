import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Brain,
  Send,
  MessageSquare,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Radio,
  SendHorizontal,
  Save,
  Key,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchSalesForecast,
  generateMarketingCampaign,
  fetchTelegramConfig,
  saveTelegramConfig,
  sendTelegramTestNotification,
  askAdminAi,
} from '../../services/api';
import { notifySyncEvent } from '../../utils/syncManager';

export const AICenter: React.FC = () => {
  const [forecastData, setForecastData] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Telegram Config State
  const [telegramConfig, setTelegramConfig] = useState<any>(null);
  const [botTokenInput, setBotTokenInput] = useState('8816495224:AAFuYrdgUe-rwcqbFp-xthP4Cxd3I1TTpEo');
  const [adminIdInput, setAdminIdInput] = useState('7230016421');
  const [customWebAppUrlInput, setCustomWebAppUrlInput] = useState('');
  const [savingTelegramCredentials, setSavingTelegramCredentials] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Marketing Generator State
  const [topic, setTopic] = useState("Katta Dam O'lish Chegirmalari");
  
  // Admin AI Chatbot Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'admin' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: "Assalomu alaykum, Admin! Men Tradeuz SFA va ERP tizimining shaxsiy AI yordamchisiman. Mahsulotlar narxini o'zgartirish, qarzdorliklarni tahlil qilish yoki agentlar hisobotini olish uchun menga buyruq berishingiz mumkin.",
      time: 'Hozir',
    },
  ]);
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);

  const handleSendAiPrompt = async (promptText?: string) => {
    const textToSend = promptText || aiPrompt;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'admin' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiChatMessages((prev) => [...prev, userMsg]);
    if (!promptText) setAiPrompt('');
    setIsAiChatLoading(true);

    try {
      const res = await askAdminAi(textToSend);
      const aiReply = {
        sender: 'ai' as const,
        text: res.text || 'Buyruq bajarildi va tahlil tayyorlandi.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAiChatMessages((prev) => [...prev, aiReply]);
      notifySyncEvent();
    } catch (err) {
      console.error(err);
      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Xatolik yuz berdi, lekin tizim sozlamalari saqlandi.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiChatLoading(false);
    }
  };
  const [channel, setChannel] = useState<'telegram' | 'sms' | 'email'>('telegram');
  const [targetAudience, setTargetAudience] = useState('Barcha faol mijozlar');
  const [generatedCampaign, setGeneratedCampaign] = useState<any>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(false);

  useEffect(() => {
    loadForecast();
    loadTelegramConfig();
  }, []);

  const loadForecast = async () => {
    setLoadingForecast(true);
    try {
      const data = await fetchSalesForecast();
      setForecastData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForecast(false);
    }
  };

  const loadTelegramConfig = async () => {
    try {
      const config = await fetchTelegramConfig();
      setTelegramConfig(config);
      if (config.botTokenFull) setBotTokenInput(config.botTokenFull);
      if (config.adminId) setAdminIdInput(config.adminId);
      if (config.customWebAppUrl) setCustomWebAppUrlInput(config.customWebAppUrl);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTelegramCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTelegramCredentials(true);
    setTelegramTestStatus(null);
    try {
      const res = await saveTelegramConfig({
        botToken: botTokenInput,
        adminId: adminIdInput,
        customWebAppUrl: customWebAppUrlInput,
      });
      setTelegramConfig(res);
      if (res.botInfo) {
        setTelegramTestStatus(`✅ Bot muvaffaqiyatli ulangan! Bot nomi: @${res.botInfo.username} (${res.botInfo.first_name})`);
      } else if (res.status === 'TOKEN_INVALID') {
        setTelegramTestStatus(`⚠️ Telegram Bot Token noto'g'ri kiritilgan. Iltimos, @BotFather bergan tokenni qayta tekshiring.`);
      } else {
        setTelegramTestStatus(`✅ Telegram sozlamalari saqlandi.`);
      }
    } catch (err) {
      console.error('Error saving telegram config:', err);
      setTelegramTestStatus("❌ Sozlamalarni saqlashda xatolik yuz berdi.");
    } finally {
      setSavingTelegramCredentials(false);
    }
  };

  const handleTestTelegramNotification = async () => {
    setTestingTelegram(true);
    setTelegramTestStatus(null);
    try {
      const result = await sendTelegramTestNotification();
      if (result.success) {
        setTelegramTestStatus(`✅ Admin ID (${adminIdInput}) ga Telegram test xabari muvaffaqiyatli yetkazildi! Telegram ilovangizni tekshiring.`);
      } else {
        setTelegramTestStatus("⚠️ Telegram xabar yuborishda xatolik. Botga kiring va avval /start tugmasini bosing.");
      }
    } catch (e) {
      setTelegramTestStatus("❌ Xatolik yuz berdi.");
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleGenerateCampaign = async () => {
    setLoadingCampaign(true);
    try {
      const result = await generateMarketingCampaign(topic, channel, targetAudience);
      setGeneratedCampaign(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCampaign(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900/60 via-slate-900 to-slate-900 p-6 rounded-3xl border border-sky-500/30 flex items-center justify-between shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">AI Supermarket Innovation Hub</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Google Gemini 3.6 Flash va Telegram Bot Integration Engine asosida ishlovchi avtonom operator, talab bashorati hamda avtomatlashtirilgan marketing.
          </p>
        </div>

        <button
          onClick={loadForecast}
          disabled={loadingForecast}
          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Brain className="w-4 h-4" />
          <span>{loadingForecast ? "AI O'ylamoqda..." : 'Prognozni Yangilash'}</span>
        </button>
      </div>

      {/* Live Admin AI Interactive Assistant Chatbot */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <span>Admin AI Chat Yordamchisi (Gemini Intelligent Copilot)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Aytgan buyruqlaringiz bo'yicha tahlil qiladi, narxlarni hisoblaydi va hisobotlar beradi.
              </p>
            </div>
          </div>
        </div>

        {/* Quick prompt suggestions */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 text-[11px] font-bold">Tezkor buyruqlar:</span>
          {[
            "Qarzdor do'konlar ro'yxati va umumiy qarz qancha?",
            "Zaxirasi kam mahsulotlar bor-mi?",
            "Chakana narxlarga 10% ustama qo'shish bo'yicha maslahat ber",
            "Agentlar oxirgi savdosi tahlili",
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSendAiPrompt(promptText)}
              className="bg-slate-950 hover:bg-slate-800 text-sky-400 border border-sky-500/30 font-medium px-3 py-1 rounded-xl text-[11px] transition-all"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Chat History Container */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3 max-h-72 overflow-y-auto font-sans">
          {aiChatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 text-xs ${
                msg.sender === 'admin' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  AI
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl p-3 space-y-1 ${
                  msg.sender === 'admin'
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                <div className="text-[9px] opacity-60 text-right">{msg.time}</div>
              </div>
            </div>
          ))}

          {isAiChatLoading && (
            <div className="flex gap-2 items-center text-amber-400 text-xs font-bold animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>AI Admin buyrug'ini tahlil qilmoqda va ma'lumotlarni yig'moqda...</span>
            </div>
          )}
        </div>

        {/* Chat Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendAiPrompt();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="AI yordamchisiga buyruq berishingiz mumkin (masalan: barcha optom narxlarni va qarzlarni ko'rsat)..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="flex-1 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 font-medium"
          />
          <button
            type="submit"
            disabled={isAiChatLoading || !aiPrompt.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Yuborish</span>
          </button>
        </form>
      </div>
      {/* Telegram Bot & Admin Credentials Management Hub */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Telegram Bot Integratsiyasi va Boshqaruv Hubi</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  ONLINE POLLING
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                O'zingizning Telegram Bot Tokeningiz va Admin Chat ID raqamingizni ulang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>Qanday sozlanadi?</span>
            </button>

            <button
              type="button"
              onClick={handleTestTelegramNotification}
              disabled={testingTelegram}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>{testingTelegram ? 'Yuborilmoqda...' : 'Admin-ga Test Xabari Yuborish'}</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions & 403 Explanation Collapsible */}
        {showInstructions && (
          <div className="bg-slate-950 border border-sky-500/30 p-4 rounded-2xl text-xs text-slate-300 space-y-3 font-sans">
            <h4 className="font-extrabold text-sky-400 text-xs flex items-center gap-1.5">
              <span>📖 Real Telegram Botni Sozlash Bo'yicha Qadam-ba-Qadam Qo'llanma:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
              <li>
                Telegram ilovasida <strong>@BotFather</strong> rasmiy botiga kiring va <code>/newbot</code> buyrug'ini yuboring.
              </li>
              <li>
                Botingizga nom va username bering (masalan: <i>MySupermarketBot</i>).
              </li>
              <li>
                @BotFather bergan uzun <strong>API Token</strong>-ni nusxalab oling (masalan: <code>8816495224:AAFuYrdg...</code>) va pastdagi birinchi katakka joylang.
              </li>
              <li>
                Telegramda o'z shaxsiy Chat ID raqamingizni bilish uchun <strong>@userinfobot</strong> yoki <strong>@getmyid_bot</strong> botiga kiring va <code>Id</code> raqamingizni ikkinchi katakka yozing.
              </li>
              <li>
                <strong>"💾 Bot Sozlamalarini Saqlash va Faollashtirish"</strong> tugmasini bosing! Yaratgan botingizga kirib <code>/start</code> tugmasini bosing va sinab ko'ring!
              </li>
            </ol>

            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-1 text-amber-200 text-[11px]">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>⚠️ Nega Telegram Mini App ochilganda "403 Forbidden" xatosi chiqadi?</span>
              </div>
              <p>
                Google AI Studio sandbox dev havola (<code>ais-dev-...run.app</code>) Google avtorizatsiyasi bilan himoyalangan, shuning uchun Telegram ichki brauzeri sessiya kalitisiz kirganda Google 403 xatosini beradi.
              </p>
              <div className="pt-1 font-semibold text-sky-300 space-y-0.5">
                <p>💡 <b>Yechimlar:</b></p>
                <p>1. <b>Ilova simulyatorida tekshirish:</b> Tizimimizdagi <b>"Mijoz & Agent App"</b> tugmasini bossangiz, Mini App 100% real holatda ishlaydi.</p>
                <p>2. <b>Telegramda chat orqali buyurtma:</b> Telegram botga matn ko'rinishida yozsangiz (masalan: <i>"2 ta cola va 1 ta non yubor"</i>), serverimizdagi AI Avtopilot avtomatik zakaz oladi.</p>
                <p>3. <b>Ommaviy Nashr qilish:</b> AI Studio tepasidagi <b>"Nashr qilish" (Deploy)</b> tugmasini bosib, ochiq domen havolasini oling va pastdagi "Ommaviy WebApp URL" katagiga joylang!</p>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSaveTelegramCredentials} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bot Token Input */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1 text-sky-400">
                  <Key className="w-3.5 h-3.5" />
                  <span>Telegram Bot Token (@BotFather):</span>
                </span>
                {telegramConfig?.botInfo ? (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    @{telegramConfig.botInfo.username}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Token</span>
                )}
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: 8816495224:AAFuYrdgUe-rwcqbFp-xthP4Cxd3I1TTpEo"
                value={botTokenInput}
                onChange={(e) => setBotTokenInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs p-2.5 rounded-xl focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Admin Chat ID Input */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1 text-amber-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Bosh Admin Telegram Chat ID:</span>
                </span>
                <span className="text-[10px] text-amber-400 font-bold">@userinfobot</span>
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: 7230016421"
                value={adminIdInput}
                onChange={(e) => setAdminIdInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Custom WebApp Public Domain URL Input */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-extrabold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-400">
                <Radio className="w-3.5 h-3.5" />
                <span>Ommaviy Nashr Qilingan WebApp URL (Ixtiyoriy Public URL):</span>
              </span>
              <span className="text-[10px] text-slate-400">403 xatolikni oldini olish uchun</span>
            </label>
            <input
              type="url"
              placeholder="Masalan: https://my-supermarket-app.vercel.app (Bo'sh qoldirilsa, standart dev havola ishlatiladi)"
              value={customWebAppUrlInput}
              onChange={(e) => setCustomWebAppUrlInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs p-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Real vaqtda Telegram API orqali mijozlar buyurtmalari keladi</span>
            </div>

            <button
              type="submit"
              disabled={savingTelegramCredentials}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{savingTelegramCredentials ? 'Saqlanmoqda...' : '💾 Bot Sozlamalarini Saqlash va Faollashtirish'}</span>
            </button>
          </div>
        </form>

        {telegramTestStatus && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-700 text-xs text-sky-300 font-medium">
            {telegramTestStatus}
          </div>
        )}
      </div>


      {/* Grid: Forecast & AI Marketing */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left - Demand & Sales Forecast Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>AI Sales & Demand Prediction (7 Kunlik)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {forecastData?.overallAiSummary || 'Tahlil qilinmoqda...'}
            </p>
          </div>

          <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
            {forecastData?.forecast?.map((f: any) => (
              <div
                key={f.productId}
                className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-100">{f.productName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.riskOfStockout === 'High'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : f.riskOfStockout === 'Medium'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    Xavf: {f.riskOfStockout}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-xl">
                  <div>Qoldiq: <strong className="text-slate-200">{f.currentStock}</strong></div>
                  <div>Kutilayotgan talab: <strong className="text-sky-400">{f.predictedDemandNext7Days}</strong></div>
                  <div>Zaxira tavsiyasi: <strong className="text-emerald-400">+{f.recommendedRestock}</strong></div>
                </div>

                <p className="text-[11px] text-slate-300 font-medium italic">
                  💡 {f.suggestedActionUz}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right - AI Marketing Campaign Generator */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span>AI Automated Marketing Generator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Telegram Postlar, SMS reklama va Email targ'ibot matnlarini Gemini AI bilan avto-yaratish
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Aksiya yoki reklama mavzusi:</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Kanal:</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
                  >
                    <option value="telegram">Telegram Post / Bot Message</option>
                    <option value="sms">SMS Marketing</option>
                    <option value="email">Email Newsletter</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Maqsadli Auditoriya:</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateCampaign}
                disabled={loadingCampaign}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loadingCampaign ? 'AI Yozmoqda...' : 'Reklama Matnini Generatsiya Qilish'}</span>
              </button>
            </div>

            {/* Generated Campaign Output */}
            {generatedCampaign && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-sky-400 font-bold">
                  <span>{generatedCampaign.title}</span>
                  <span className="text-emerald-400">Tavsiya etilgan chegirma: {generatedCampaign.suggestedDiscount}</span>
                </div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-900 p-3 rounded-xl border border-slate-800">
                  {generatedCampaign.content}
                </p>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400 italic">{generatedCampaign.callToAction}</span>
                  <button
                    onClick={() => alert('Xabarnoma barcha Telegram foydalanuvchilariga yuborishga tayyor!')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Yuborish (Send)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
