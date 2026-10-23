import React from 'react';
import { Wifi, Sparkles, HandMetal } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SegmentedControl } from './SegmentedControl';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="pb-6 select-none">
      {/* Mobile Top App Bar (shown only on phones) */}
      <div className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-200/50">
        <NavLink to="/" className="flex items-center gap-2 clay-focus rounded-xl">
          <div className="w-8 h-8 rounded-xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised-sm">
            <HandMetal className="w-4 h-4" />
          </div>
          <span className="text-xl font-black text-[#2B2D42]">Ishara</span>
        </NavLink>

        <SegmentedControl showBadge={false} />
      </div>

      {/* Main Header Container */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {title && (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2B2D42] tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm font-semibold text-[#6E7387] mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          {/* Offline / Online indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-bold text-[#2B2D42] shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A8E6A1] ring-2 ring-emerald-300/40 animate-pulse"></span>
            <span>ONLINE</span>
          </div>

          {/* Sync indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-bold text-[#6E7387] shadow-sm">
            <Wifi className="w-3.5 h-3.5 text-[#7C9CFF]" />
            <span>SYNC ON</span>
          </div>

          {/* Top-Right ISL | ASL SegmentedControl */}
          <SegmentedControl />
        </div>
      </div>
    </header>
  );
};
