import React, { useState, useEffect } from 'react';
import { Wifi, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SegmentedControl } from './SegmentedControl';
import { LocaleSelector } from './LocaleSelector';
import { IsharaLogo } from './IsharaLogo';
import { useLocaleStore } from '../store/useLocaleStore';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, badge }) => {
  const { t } = useLocaleStore();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineReady, setOfflineReady] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check service worker / cache support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        setOfflineReady(true);
      }
      navigator.serviceWorker.ready
        .then(() => {
          setOfflineReady(true);
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="pb-6 select-none">
      {/* Mobile Top App Bar (shown only on phones) */}
      <div className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-200/50 flex-wrap gap-2">
        <NavLink to="/" className="flex items-center clay-focus rounded-xl" title="Ishara Home">
          <IsharaLogo size="sm" showWordmark={true} />
        </NavLink>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mobile Language Picker */}
          <LocaleSelector />

          {/* Small Red SOS button on mobile header */}
          <NavLink
            to="/emergency"
            className="px-2.5 py-1 rounded-xl bg-[#FF4D4D] hover:bg-[#E03E3E] text-white text-xs font-black flex items-center gap-1 shadow-sm clay-focus"
            title={t('header.emergencySos')}
            aria-label={t('header.emergencySos')}
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>SOS</span>
          </NavLink>

          <SegmentedControl showBadge={false} />
        </div>
      </div>

      {/* Main Header Container */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {title && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2B2D42] tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
          )}
          {subtitle && (
            <p className="text-sm font-semibold text-[#6E7387] mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          {/* Interface Language Picker */}
          <LocaleSelector />

          {/* Small Red SOS button in Header on every page */}
          <NavLink
            to="/emergency"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF4D4D] hover:bg-[#E03E3E] text-white text-xs font-black shadow-clay-raised-sm active:shadow-clay-pressed transition-all clay-focus"
            title={t('header.emergencySos')}
            aria-label={t('header.emergencySos')}
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>SOS</span>
          </NavLink>

          {/* Offline Ready Badge (Service Worker Cached) */}
          {offlineReady && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5F8E2] border border-[#A8E6A1]/60 text-xs font-bold text-[#2D7A4F] shadow-sm animate-fade-in"
              title="Application shell, models & emergency tools are cached for offline access"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('header.offlineReady')}</span>
            </div>
          )}

          {/* Offline / Online live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-bold text-[#2B2D42] shadow-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline
                  ? 'bg-[#A8E6A1] ring-2 ring-emerald-300/40 animate-pulse'
                  : 'bg-amber-400 ring-2 ring-amber-300/40'
              }`}
            ></span>
            <span>{isOnline ? t('header.online') : t('header.offline')}</span>
          </div>

          {/* Sync indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-bold text-[#6E7387] shadow-sm">
            <Wifi className="w-3.5 h-3.5 text-[#7C9CFF]" />
            <span>SYNC ON</span>
          </div>

          {/* Top-Right ISL | ASL SegmentedControl (Sign Language selection) */}
          <SegmentedControl />
        </div>
      </div>
    </header>
  );
};
