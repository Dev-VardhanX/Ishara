import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { useLanguageStore } from '../store/useLanguageStore';
import { Sparkles, Info } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { language } = useLanguageStore();
  const location = useLocation();

  // Check if current route is lacking ASL model/lesson data in Phase 1-3
  const isAslUnavailableRoute =
    language === 'ASL' &&
    (location.pathname.startsWith('/sign-to-voice') || location.pathname.startsWith('/learn'));

  return (
    <div className="min-h-screen bg-[#E9EEF7] text-[#2B2D42] flex flex-col md:flex-row">
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-10">
        {/* ASL Phase 4 Coming Soon Global Notification Banner when on affected routes */}
        {isAslUnavailableRoute && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FFE8E2] border border-[#FFB59E]/60 text-[#2B2D42] flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FF8A8A] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black">
                  ASL Dataset & Model Coming Soon (Roadmap Phase 4)
                </p>
                <p className="text-[11px] font-semibold text-[#6E7387]">
                  Currently previewing ISL pipeline contracts while ASL models and lessons are being finalized.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white text-[10px] font-black uppercase text-[#FF8A8A] shadow-sm">
              Phase 4 Beta
            </span>
          </div>
        )}

        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
};
