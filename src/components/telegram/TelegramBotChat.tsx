import React, { useState, useEffect } from 'react';
import { Send, Bot, Sparkles, ShoppingBag, FileSpreadsheet, RefreshCw, CheckCircle2, MapPin, Phone, ArrowRight, Mic, Gift } from 'lucide-react';
import { Product, Order } from '../../types';
import { askAIAssistant, fetchProducts } from '../../services/api';
import { getStoreSettings, subscribeStoreSettings, StoreSettings } from '../../utils/storeSettings';

interface TelegramBotChatProps {
  onOpenMiniApp: (initialTab?: string) => void;
  onOpenAdmin: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  buttons?: Array<{ text: string; action: () => void }>;
  createdOrder?: Order;
}

export const TelegramBotChat: React.FC<TelegramBotChatProps> = ({ onOpenMiniApp, onOpenAdmin }) => {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoreSettings());
    };
    const unsubscribe = subscribeStoreSettings(handleSettingsUpdate);
    try {
      window.addEventListener('store_settings_updated', handleSettingsUpdate);
    } catch {
      // ignore
    }
    return () => {
      unsubscribe();
      try {
        window.removeEventListener('store_settings_updated', handleSettingsUpdate);
      } catch {
        // ignore
      }
    };
  }, []);

  const [userPhone, setUserPhone] = useState<string>(() => localStorage.getItem('tg_user_phone') || '');
  const [isPhoneSubmitted, setIsPhoneSubmitted] = useState<boolean>(() => !!localStorage.getItem('tg_user_phone'));

  const createStartButtons = (phone?: string) => {
    if (!phone) {
      return [
        {
          text: '📱 Telefon raqamni yuborish (+998 90 999 00 11)',
          action: () => handleSharePhone('+998 90 999 00 11'),
        },
        {
          text: '🛒 Mini App-ga kirish',
          action: () => onOpenMiniApp('catalog'),
        },
      ];
    }
    return [
      { text: '🛒 Mini App-ni Ochish', action: () => onOpenMiniApp('catalog') },
      { text: '🤖 AI Operator bilan buyurtma', action: () => onOpenMiniApp('ai') },
      { text: '📄 Excel & Sklad Hub', action: () => onOpenMiniApp('excel_hub') },
      { text: '📦 Buyurtmalarim', action: () => onOpenMiniApp('orders') },
      { text: '📱 Telefon raqamni o\'zgartirish', action: () => handleRequestPhoneChange() },
    ];
  };

  const getStartText = (phone?: string) => {
    if (!phone) {
      return `<b>Salom! 🛒 Osiyo Supermarket GO (slspy) Botiga xush kelibsiz!</b>\n\nXizmatlardan to'liq foydalanish va buyurtmalaringizni rasmiylashtirish uchun, iltimos, <b>telefon raqamingizni yuboring</b>:\n\n👇 Pastdagi <b>"📱 Telefon raqamni yuborish"</b> tugmasini bosing yoki chatga raqamingizni yozing (masalan: <i>+998 90 123 45 67</i>).`;
    }
    return `<b>Salom! 🛒 Osiyo Supermarket GO Botiga xush kelibsiz!</b>\n\n✅ Qabul qilingan telefon raqam: <b>${phone}</b>\n\nSiz ushbu bot orqali:\n1️⃣ Pastdagi <b>"🛒 Mini App-ni ochish"</b> tugmasi orqali katalogdan qulay xarid qilishingiz mumkin.\n2️⃣ Menga oddiy o'zbek tilida yozing (masalan: <i>"2 ta Coca Cola 1.5L va 1 kg Shakar Yunusobod 4-mavzega"</i>), men <b>Jonli AI Operator</b> sifatida buyurtmangizni o'zim rasmiylashtiraman!`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm_start',
      sender: 'bot',
      text: getStartText(localStorage.getItem('tg_user_phone') || undefined),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      buttons: createStartButtons(localStorage.getItem('tg_user_phone') || undefined),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSharePhone = (phoneNum: string) => {
    localStorage.setItem('tg_user_phone', phoneNum);
    setUserPhone(phoneNum);
    setIsPhoneSubmitted(true);

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: `📱 Telefon raqamim: ${phoneNum}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const botReply: ChatMessage = {
      id: `b_${Date.now()}`,
      sender: 'bot',
      text: `✅ Rahmat! Telefon raqamingiz muvaffaqiyatli saqlandi: <b>${phoneNum}</b>\n\nEndi quyidagi menyu orqali xaridlarni amalga oshirishingiz mumkin:`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      buttons: createStartButtons(phoneNum),
    };

    setMessages((prev) => [...prev, userMsg, botReply]);
  };

  const handleRequestPhoneChange = () => {
    localStorage.removeItem('tg_user_phone');
    setUserPhone('');
    setIsPhoneSubmitted(false);

    const botReply: ChatMessage = {
      id: `b_${Date.now()}`,
      sender: 'bot',
      text: `📱 Iltimos, yangi telefon raqamingizni yuboring (masalan: <i>+998 90 999 00 11</i>):`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      buttons: createStartButtons(undefined),
    };

    setMessages((prev) => [...prev, botReply]);
  };

  const handleSendMessage = async (customMsg?: string) => {
    const textToSend = customMsg || inputText;
    if (!textToSend.trim()) return;
    setInputText('');

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    // Check if user sent /admin or /agent secret command
    if (['/admin', '/agent', '/login'].includes(textToSend.trim().toLowerCase())) {
      onOpenAdmin();
      return;
    }

    // Check if user sent /start command
    if (textToSend.trim().toLowerCase() === '/start') {
      const currentSaved = localStorage.getItem('tg_user_phone') || undefined;
      const startReply: ChatMessage = {
        id: `b_start_${Date.now()}`,
        sender: 'bot',
        text: getStartText(currentSaved),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        buttons: createStartButtons(currentSaved),
      };
      setMessages((prev) => [...prev, startReply]);
      return;
    }

    // Check if user typed a phone number directly
    const phoneRegex = /^(\+?998|8)?[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
    if (phoneRegex.test(textToSend.trim())) {
      const formatted = textToSend.trim();
      localStorage.setItem('tg_user_phone', formatted);
      setUserPhone(formatted);
      setIsPhoneSubmitted(true);

      const botReply: ChatMessage = {
        id: `b_phone_${Date.now()}`,
        sender: 'bot',
        text: `✅ Telefon raqamingiz saqlandi: <b>${formatted}</b>!\n\nPastdagi menyu orqali xarid qilishingiz mumkin:`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        buttons: createStartButtons(formatted),
      };
      setMessages((prev) => [...prev, botReply]);
      return;
    }

    // If phone number not submitted yet, remind user to submit phone number first
    if (!localStorage.getItem('tg_user_phone')) {
      const phonePromptReply: ChatMessage = {
        id: `b_prompt_${Date.now()}`,
        sender: 'bot',
        text: `⚠️ Davom etish uchun iltimos, avval <b>telefon raqamingizni yuboring</b>. Pastdagi tugmani bosing yoki raqamingizni yozing:`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        buttons: createStartButtons(undefined),
      };
      setMessages((prev) => [...prev, phonePromptReply]);
      return;
    }

    setIsLoading(true);

    try {
      const res = await askAIAssistant(textToSend);

      const botReply: ChatMessage = {
        id: `b_${Date.now()}`,
        sender: 'bot',
        text: res.replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        buttons: [
          { text: '🛒 Mini App-da ko\'rish', action: () => onOpenMiniApp('catalog') },
          { text: '📦 Buyurtmalar', action: () => onOpenMiniApp('orders') },
        ],
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `b_err_${Date.now()}`,
          sender: 'bot',
          text: "Kechirasiz, xabaringizni qayta ishlashda xatolik yuz berdi. Iltimos Mini App orqali xarid qiling.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          buttons: [{ text: '🛒 Mini App-ni Ochish', action: () => onOpenMiniApp('catalog') }],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 relative font-sans overflow-hidden">
      {/* Telegram Header */}
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 via-emerald-500 to-amber-400 p-0.5 relative">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-bold text-sky-400 text-sm">
              🤖
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
              <span>{storeSettings.storeName} Bot</span>
              <span className="text-[10px] bg-sky-500/20 text-sky-400 font-mono px-1.5 py-0.2 rounded border border-sky-500/30">
                {storeSettings.storeBadge}
              </span>
            </h2>
            <p className="text-[11px] text-emerald-400 font-medium">bot • online (AI Operator)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSendMessage('/start')}
            className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-xl text-xs font-bold border border-sky-500/30 transition-colors flex items-center gap-1"
            title="Botni qayta ishga tushirish"
          >
            <RefreshCw className="w-3 h-3" />
            <span>/start</span>
          </button>
        </div>
      </div>

      {/* Telegram Chat Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-2 shadow-lg ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white font-medium rounded-br-none'
                  : 'bg-slate-900/90 text-slate-100 border border-slate-800 rounded-bl-none'
              }`}
            >
              <div
                className="whitespace-pre-wrap font-sans"
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
              />
              <div className="text-[9px] text-slate-400 text-right font-mono mt-1 opacity-80">
                {msg.time}
              </div>
            </div>

            {/* Telegram Inline Buttons */}
            {msg.buttons && msg.buttons.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-1.5 w-full max-w-[85%]">
                {msg.buttons.map((btn, bIdx) => (
                  <button
                    key={bIdx}
                    onClick={btn.action}
                    className="w-full bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/30 text-sky-400 font-bold py-2.5 px-3 rounded-xl border border-sky-500/30 text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>{btn.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-slate-900 text-slate-400 text-xs px-3.5 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
              <span>SlSpy AI Operator yozmoqda...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Launch Banner for Mini App */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onOpenMiniApp('catalog')}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
          <span>🛒 TELEGRAM MINI APP-NI OCHISH</span>
        </button>
      </div>

      {/* Telegram Input Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="AI Operatorga yozing (masalan: 2x Coca Cola Yunusobodga)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 bg-slate-950 text-xs text-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 transition-colors"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 p-2.5 rounded-xl font-bold transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
