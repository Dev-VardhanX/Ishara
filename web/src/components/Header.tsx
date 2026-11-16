import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="pb-6 select-none">
      {/* Mobile Top App Bar (shown only on phones) */}
      <div className="md:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-200/50 flex-wrap gap-2">
        <NavLink to="/" className="flex items-center clay-focus rounded-xl" title={t('header.homeTitle')}>
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
          {/* Offline Warning (Only shown when internet disconnects) */}
          {!isOnline && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-bold text-amber-800 shadow-sm animate-pulse"
              title={t('header.offline')}
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('header.offline')}</span>
            </div>
          )}

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

          {/* Sign Language selection (ISL | ASL) */}
          <SegmentedControl />
        </div>
      </div>
    </header>
  );
};
