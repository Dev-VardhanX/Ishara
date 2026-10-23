import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  MessageSquare,
  GraduationCap,
  History,
  Activity,
  HandMetal,
  LogOut,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuth } from '../context/AuthContext';

interface NavItemConfig {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  hasAsl: boolean;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { user, logout } = useAuth();

  const navItems: NavItemConfig[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      activeClass: 'bg-[#7C9CFF] text-white shadow-clay-raised',
      hasAsl: true,
    },
    {
      name: 'Sign to Voice',
      path: '/sign-to-voice',
      icon: Video,
      activeClass: 'bg-[#7C9CFF] text-white shadow-clay-raised',
      hasAsl: false, // ASL vision model is Phase 4
    },
    {
      name: 'Voice to Sign',
      path: '/voice-to-sign',
      icon: MessageSquare,
      activeClass: 'bg-[#FF8A8A] text-white shadow-clay-raised',
      hasAsl: true,
    },
    {
      name: 'Learn Sign',
      path: '/learn',
      icon: GraduationCap,
      activeClass: 'bg-[#5ECB82] text-white shadow-clay-raised',
      hasAsl: false, // ASL lessons are Phase 4
    },
    {
      name: 'History',
      path: '/history',
      icon: History,
      activeClass: 'bg-[#B39DDB] text-white shadow-clay-raised',
      hasAsl: true,
    },
    {
      name: 'Dev Pose / Rig',
      path: '/dev/pose',
      icon: Activity,
      activeClass: 'bg-[#2B2D42] text-white shadow-clay-raised',
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
        {/* Brand Header */}
        <NavLink to="/" className="flex items-center gap-3 px-3 py-2 mb-8 group clay-focus rounded-2xl">
          <div className="w-10 h-10 rounded-2xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised">
            <HandMetal className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-[#2B2D42]">Ishara</span>
            <span className="block text-[11px] font-bold text-[#7C9CFF] tracking-wider uppercase">
              {language} Translator
            </span>
          </div>
        </NavLink>

        {/* Navigation links with distinct active pill color per item */}
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
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3.5 min-w-0">
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {/* "Coming soon" badge when ASL is selected on items without ASL data */}
                  {language === 'ASL' && !item.hasAsl && (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 tracking-wider ${
                        isActive
                          ? 'bg-white/30 text-white border border-white/40'
                          : 'bg-[#FFE8E2] text-[#FF8A8A] border border-[#FFB59E]/40'
                      }`}
                    >
                      Soon
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Card with Logout at the bottom */}
      <div className="mt-6 pt-4 border-t border-slate-200/60">
        <div className="clay-card p-3.5 flex items-center justify-between gap-3 bg-[#E9EEF7]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C9CFF] to-[#D4A5FF] flex items-center justify-center font-black text-white text-sm shadow-sm ring-2 ring-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#2B2D42] truncate" title={displayName}>
                {displayName}
              </p>
              <p className="text-[10px] text-[#6E7387] font-semibold truncate" title={user?.email}>
                {user?.email || 'Active Session'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="p-2 text-[#6E7387] hover:text-[#FF8A8A] hover:bg-white/60 rounded-xl clay-focus transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
