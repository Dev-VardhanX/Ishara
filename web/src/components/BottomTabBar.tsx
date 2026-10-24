import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  MessageSquare,
  GraduationCap,
  History,
} from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';

export const BottomTabBar: React.FC = () => {
  const { language } = useLanguageStore();

  const tabItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      activeClass: 'bg-[#7C9CFF] text-white shadow-clay-raised-sm',
      hasAsl: true,
    },
    {
      name: 'Sign-to-Voice',
      path: '/sign-to-voice',
      icon: Video,
      activeClass: 'bg-[#7C9CFF] text-white shadow-clay-raised-sm',
      hasAsl: false,
    },
    {
      name: 'Voice-to-Sign',
      path: '/voice-to-sign',
      icon: MessageSquare,
      activeClass: 'bg-[#FF8A8A] text-white shadow-clay-raised-sm',
      hasAsl: true,
    },
    {
      name: 'Learn',
      path: '/learn',
      icon: GraduationCap,
      activeClass: 'bg-[#5ECB82] text-white shadow-clay-raised-sm',
      hasAsl: false,
    },
    {
      name: 'History',
      path: '/history',
      icon: History,
      activeClass: 'bg-[#B39DDB] text-white shadow-clay-raised-sm',
      hasAsl: true,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#E9EEF7]/95 backdrop-blur border-t border-slate-200/80 px-2 py-2 flex items-center justify-around shadow-clay-raised select-none"
      aria-label="Mobile Navigation"
    >
      {tabItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl text-[10px] font-black transition-all clay-focus ${
              isActive
                ? `${item.activeClass} -translate-y-1`
                : 'text-[#6E7387] hover:text-[#2B2D42]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-[62px]">{item.name}</span>

              {/* ASL Coming Soon Dot/Badge */}
              {language === 'ASL' && !item.hasAsl && (
                <span
                  className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[8px] font-black uppercase bg-[#FF8A8A] text-white"
                  title="ASL coming soon"
                >
                  Soon
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
