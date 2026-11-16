import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  MessageSquare,
  GraduationCap,
  History,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import { useLocaleStore } from '../store/useLocaleStore';
import { useAuth } from '../context/AuthContext';
import { IsharaLogo } from './IsharaLogo';

interface NavItemConfig {
  key: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  hasAsl: boolean;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { t } = useLocaleStore();
  const { user, logout } = useAuth();

  const navItems: NavItemConfig[] = [
    {
      key: 'dashboard',
      name: t('nav.dashboard'),
      path: '/dashboard',
      icon: LayoutDashboard,
      activeClass: 'bg-[#7C9CFF] text-white shadow-clay-raised',
      hasAsl: true,
    },
    {
      key: 'signToVoice',
      name: t('nav.signToVoice'),
      path: '/sign-to-voice',
      icon: Video,
      activeClass: 'bg-[#7C9CFF] text-white shadow-clay-raised',
      hasAsl: false,
    },
    {
      key: 'voiceToSign',
      name: t('nav.voiceToSign'),
      path: '/voice-to-sign',
      icon: MessageSquare,
      activeClass: 'bg-[#FF8A8A] text-white shadow-clay-raised',
      hasAsl: true,
    },
    {
      key: 'learn',
      name: t('nav.learn'),
      path: '/learn',
      icon: GraduationCap,
      activeClass: 'bg-[#5ECB82] text-white shadow-clay-raised',
      hasAsl: false,
    },
    {
      key: 'history',
      name: t('nav.history'),
      path: '/history',
      icon: History,
      activeClass: 'bg-[#B39DDB] text-white shadow-clay-raised',
      hasAsl: true,
    },
    {
      key: 'emergency',
      name: t('nav.emergency'),
      path: '/emergency',
      icon: AlertTriangle,
      activeClass: 'bg-[#FF4D4D] text-white shadow-clay-raised',
      hasAsl: true,
    },
    {
      key: 'settings',
      name: t('nav.settings'),
      path: '/settings',
      icon: SettingsIcon,
      activeClass: 'bg-[#8EA7E9] text-white shadow-clay-raised',
      hasAsl: true,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Ananya Sharma';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <aside className="w-64 min-h-screen bg-transparent p-6 flex flex-col justify-between select-none shrink-0 border-r border-slate-200/40">
      <div>
        {/* Brand Header with Unified Ishara Logo */}
        <NavLink to="/" className="flex items-center px-3 py-2 mb-8 group clay-focus rounded-2xl" aria-label={t('nav.homeTitle')}>
          <IsharaLogo size="md" showWordmark={true} subtitle={`${language} Translator`} />
        </NavLink>

        {/* Navigation links */}
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3.5 rounded-clay font-bold text-sm transition-all clay-focus ${
                  isActive
                    ? item.activeClass
                    : 'text-[#6E7387] hover:text-[#2B2D42] hover:bg-white/50'
                }`
              }
              aria-label={item.name}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-[#6E7387]'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {language === 'ASL' && !item.hasAsl && (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#FFE8E2] text-[#FF8A8A]'
                      }`}
                      title={t('dashboard.aslComingSoon')}
                    >
                      {t('common.beta')}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Session & Logout Panel */}
      <div className="pt-6 border-t border-slate-200/50 space-y-3">
        {user ? (
          <div className="clay-card p-3.5 flex items-center justify-between bg-white/70">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#7C9CFF] to-[#D4A5FF] flex items-center justify-center text-white font-extrabold text-xs shadow-inner shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-black text-[#2B2D42] truncate">
                  {displayName}
                </span>
                <span className="block text-[10px] font-bold text-[#6E7387] truncate">
                  {user.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-[#6E7387] hover:text-[#FF8A8A] hover:bg-red-50/50 transition-colors clay-focus"
              title={t('nav.logout')}
              aria-label={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="clay-button w-full py-3 text-xs font-black flex items-center justify-center gap-2 clay-focus shadow-clay-raised-sm"
          >
            <span>{t('nav.login')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </NavLink>
        )}
      </div>
    </aside>
  );
};
