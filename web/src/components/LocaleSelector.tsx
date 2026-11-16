import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLocaleStore, SUPPORTED_LOCALES, AppLocale } from '../store/useLocaleStore';

interface LocaleSelectorProps {
  className?: string;
  variant?: 'compact' | 'expanded';
}

export const LocaleSelector: React.FC<LocaleSelectorProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { locale, setLocale, loading, t } = useLocaleStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLocale = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: AppLocale) => {
    setLocale(code);
    setOpen(false);
  };

  if (variant === 'expanded') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 ${className}`}>
        {SUPPORTED_LOCALES.map((item) => {
          const isSelected = item.code === locale;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item.code)}
              className={`p-3 rounded-2xl border text-left transition-all clay-focus flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#7C9CFF] text-white shadow-clay-raised-sm border-transparent'
                  : 'bg-white/80 hover:bg-white text-[#2B2D42] border-slate-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-base font-black leading-snug">{item.nativeName}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span
                className={`text-[10px] font-bold mt-1 ${
                  isSelected ? 'text-white/80' : 'text-[#6E7387]'
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="clay-button px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 clay-focus bg-white/80 hover:bg-white border border-slate-200/60 shadow-clay-raised-sm"
        aria-label={t('settings.interfaceLanguage')}
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 text-[#7C9CFF]" />
        <span className="text-[#2B2D42]">{activeLocale.nativeName}</span>
        <ChevronDown
          className={`w-3 h-3 text-[#6E7387] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 max-h-72 overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-clay-raised p-1.5 z-50 animate-scaleUp">
          <div className="px-2.5 py-1 text-[9px] font-black uppercase text-[#6E7387] tracking-wider border-b border-slate-100 mb-1">
            {t('settings.interfaceLanguage')}
          </div>
          {SUPPORTED_LOCALES.map((item) => {
            const isSelected = item.code === locale;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-black flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-[#7C9CFF] text-white shadow-sm'
                    : 'text-[#2B2D42] hover:bg-slate-100'
                }`}
              >
                <span>{item.nativeName}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#6E7387]'}`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
