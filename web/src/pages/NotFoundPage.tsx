// src/pages/NotFoundPage.tsx — 404 Claymorphic Error View
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { HandMetal, Home, ArrowLeft } from 'lucide-react';
import { useLocaleStore } from '../store/useLocaleStore';

export const NotFoundPage: React.FC = () => {
  const { t } = useLocaleStore();

  useEffect(() => {
    document.title = `${t('notFound.title')}`;
  }, [t]);

  return (
    <div className="min-h-screen bg-[#E9EEF7] flex items-center justify-center p-6 select-none">
      <div className="clay-card p-8 sm:p-12 max-w-md w-full text-center space-y-6 bg-[#E9EEF7] border border-white/60">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised">
          <HandMetal className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#FF8A8A] px-3 py-1 rounded-full bg-[#FFE8E2] border border-[#FFB59E]/40">
            {t('notFound.code')}
          </span>
          <h1 className="text-3xl font-black text-[#2B2D42] tracking-tight pt-2">
            {t('notFound.heading')}
          </h1>
          <p className="text-xs font-semibold text-[#6E7387] leading-relaxed">
            {t('notFound.message')}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NavLink
            to="/"
            className="clay-button w-full sm:w-auto px-6 py-3 text-xs font-black flex items-center justify-center gap-2 clay-focus"
          >
            <Home className="w-4 h-4" />
            <span>{t('notFound.backHome')}</span>
          </NavLink>
          <NavLink
            to="/dashboard"
            className="clay-button clay-button-white w-full sm:w-auto px-6 py-3 text-xs font-black flex items-center justify-center gap-2 clay-focus"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('notFound.dashboard')}</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
