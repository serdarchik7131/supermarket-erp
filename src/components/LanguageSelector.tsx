import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, Language, LANGUAGE_LABELS } from '../context/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'pill' | 'dropdown' | 'compact' | 'full';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: Language[] = ['uz', 'ru', 'en'];

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80 ${className}`}>
        {languages.map((lang) => {
          const active = language === lang;
          const info = LANGUAGE_LABELS[lang];
          return (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                active
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 ring-1 ring-emerald-500/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <span>{info.flag}</span>
              <span>{info.code}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100/90 hover:bg-gray-200/80 text-gray-800 text-xs font-semibold transition-colors border border-gray-200"
          title="Tilni o'zgartirish / Сменить язык / Change language"
        >
          <span>{LANGUAGE_LABELS[language].flag}</span>
          <span>{LANGUAGE_LABELS[language].code}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
            {languages.map((lang) => {
              const active = language === lang;
              const info = LANGUAGE_LABELS[lang];
              return (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                    active ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{info.flag}</span>
                    <span>{info.label}</span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`grid grid-cols-3 gap-2 ${className}`}>
        {languages.map((lang) => {
          const active = language === lang;
          const info = LANGUAGE_LABELS[lang];
          return (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all ${
                active
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-1">{info.flag}</span>
              <span>{info.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200 transition-all shadow-xs"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600" />
        <span>{LANGUAGE_LABELS[language].flag}</span>
        <span>{LANGUAGE_LABELS[language].label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in duration-100">
          <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-gray-400 border-b border-gray-100 mb-1">
            Tilni tanlang / Язык
          </div>
          {languages.map((lang) => {
            const active = language === lang;
            const info = LANGUAGE_LABELS[lang];
            return (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                  active ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{info.flag}</span>
                  <span>{info.label}</span>
                </span>
                {active && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
