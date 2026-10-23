import React from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { Sparkles } from 'lucide-react';

interface SegmentedControlProps {
  className?: string;
  showBadge?: boolean;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ className = '', showBadge = true }) => {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Pill container */}
      <div className="flex items-center p-1 bg-white/80 rounded-full border border-slate-200/60 shadow-sm backdrop-blur select-none">
        <button
          type="button"
          onClick={() => setLanguage('ISL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all clay-focus ${
            language === 'ISL'
              ? 'bg-[#7C9CFF] text-white shadow-clay-raised-sm'
              : 'text-[#6E7387] hover:text-[#2B2D42]'
          }`}
          aria-pressed={language === 'ISL'}
        >
          ISL
        </button>

        <button
          type="button"
          onClick={() => setLanguage('ASL')}
          className={`relative px-3.5 py-1.5 rounded-full text-xs font-black transition-all clay-focus ${
            language === 'ASL'
              ? 'bg-[#FF8A8A] text-white shadow-clay-raised-sm'
              : 'text-[#6E7387] hover:text-[#2B2D42]'
          }`}
          aria-pressed={language === 'ASL'}
        >
          <span>ASL</span>
          {showBadge && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-[#FFE8E2] text-[#FF8A8A] border border-[#FFB59E]/40">
              Beta
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
