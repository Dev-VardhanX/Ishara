import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useLanguageStore } from '../store/useLanguageStore';
import {
  getRecentConversations,
  fetchRecentConversations,
  getProgress,
  fetchProgress,
  getUserSettings,
  updateUserSettings,
  RecentConversation,
  UserProgress,
  UserSettings,
} from '../data/store';
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  Settings as SettingsIcon,
  X,
  Volume2,
  Check,
  Clock,
  ExternalLink,
  Video,
  MessageSquare,
  GraduationCap,
  History as HistoryIcon,
  HandMetal,
  Flame,
} from 'lucide-react';
import { useLocaleStore } from '../store/useLocaleStore';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguageStore();
  const { t } = useLocaleStore();

  // Local & Supabase data store state
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Set document title
  useEffect(() => {
    document.title = `${t('nav.dashboard')} — Ishara`;
  }, [t]);

  // Load data from centralized store on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [convResult, progResult] = await Promise.all([
          fetchRecentConversations(3),
          fetchProgress(),
        ]);
        if (isMounted) {
          setConversations(convResult.data);
          setIsOffline(convResult.isOffline);
          setProgress(progResult.progress);
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    setSettings(getUserSettings());
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetingMorning');
    if (hour < 17) return t('dashboard.greetingAfternoon');
    return t('dashboard.greetingEvening');
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Ananya';
  const userEmail = user?.email;

  // 5 Feature Cards strictly matching requirements
  const featureCards = [
    {
      id: 'sign-to-voice',
      title: t('nav.signToVoice'),
      desc: t('dashboard.cardSignToVoiceDesc'),
      actionText: t('dashboard.cardSignToVoiceAction'),
      link: '/sign-to-voice',
      icon: Video,
      iconColor: 'text-[#7C9CFF]',
      hasAsl: false,
    },
    {
      id: 'voice-to-sign',
      title: t('nav.voiceToSign'),
      desc: t('dashboard.cardVoiceToSignDesc'),
      actionText: t('dashboard.cardVoiceToSignAction'),
      link: '/voice-to-sign',
      icon: MessageSquare,
      iconColor: 'text-[#FF8A8A]',
      hasAsl: true,
    },
    {
      id: 'learn-sign',
      title: t('nav.learn'),
      desc: t('dashboard.cardLearnDesc'),
      actionText: t('dashboard.cardLearnAction'),
      link: '/learn',
      icon: GraduationCap,
      iconColor: 'text-[#5ECB82]',
      hasAsl: false,
    },
    {
      id: 'history',
      title: t('nav.history'),
      desc: t('dashboard.cardHistoryDesc'),
      actionText: t('dashboard.cardHistoryAction'),
      link: '/history',
      icon: HistoryIcon,
      iconColor: 'text-[#B39DDB]',
      hasAsl: true,
    },
    {
      id: 'settings',
      title: t('nav.settings'),
      desc: t('dashboard.cardSettingsDesc'),
      actionText: t('dashboard.cardSettingsAction'),
      link: '/settings',
      icon: SettingsIcon,
      iconColor: 'text-[#2B2D42]',
      hasAsl: true,
    },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Top Greeting Header with Dynamic User Name & Email */}
      <Header
        title={`${getGreeting()}, ${userName}!`}
        subtitle={
          userEmail
            ? `${userEmail} • ${t('dashboard.readySubtitle', { lang: language })}`
            : t('dashboard.readySubtitle', { lang: language })
        }
      />

      {/* 5 Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureCards.map((card) => {
          return (
            <NavLink
              key={card.id}
              to={card.link}
              className="clay-card p-7 flex flex-col justify-between group clay-focus relative overflow-hidden cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
                    <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                  </div>

                  {language === 'ASL' && !card.hasAsl && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#FFE8E2] text-[#FF8A8A] border border-[#FFB59E]/40 tracking-wider">
                      {t('common.comingSoon')}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-black text-[#2B2D42] group-hover:text-[#7C9CFF] transition-colors">
                  {card.title}
                </h2>
                <p className="text-xs font-semibold text-[#6E7387] mt-2 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="pt-6 flex items-center gap-1.5 font-black text-xs text-[#7C9CFF]">
                <span>{card.actionText}</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Section: Learning Progress & Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Learning Progress Card */}
        <div className="lg:col-span-7 clay-card p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-[#2B2D42]">{t('dashboard.learningProgress')}</h3>
                <p className="text-xs font-semibold text-[#6E7387]">
                  {t('dashboard.learningProgressSub')}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#E2EBFF] text-[#7C9CFF] text-xs font-black uppercase tracking-wider shadow-sm">
                {t('common.level', { level: progress?.level || 14 })}
              </span>
            </div>

            {/* Progress Bars */}
            <div className="space-y-5">
              {progress?.topics.map((topic) => (
                <div key={topic.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-[#2B2D42]">{topic.title}</span>
                    <span className="text-[#6E7387]">{topic.percentage}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${topic.percentage}%`,
                        backgroundColor: topic.barColor,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E7387]">
              {t('dashboard.currentStreak')} <strong className="text-[#FF8A8A] inline-flex items-center gap-1">{t('common.daysCount', { count: progress?.streakDays || 12 })} <Flame className="w-3.5 h-3.5 text-[#FF8A8A]" /></strong>
            </span>
            <NavLink
              to="/learn"
              className="text-xs font-black text-[#7C9CFF] hover:underline flex items-center gap-1"
            >
              <span>{t('dashboard.goToLessons')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </div>

        {/* Recent Conversations Card */}
        <div className="lg:col-span-5 clay-card p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-[#2B2D42]">{t('dashboard.recentConversations')}</h3>
                <p className="text-xs font-semibold text-[#6E7387]">
                  {t('dashboard.recentConversationsSub')}
                </p>
              </div>
              <NavLink
                to="/history"
                className="text-xs font-black text-[#7C9CFF] hover:underline"
              >
                {t('dashboard.viewAllHistory')}
              </NavLink>
            </div>

            {/* Conversation Items */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white/40 animate-pulse flex items-center justify-between border border-slate-200/30"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-slate-200/80 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-slate-200/80 rounded w-3/4" />
                        <div className="h-2 bg-slate-200/60 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-[#6E7387] bg-white/40 rounded-2xl border border-slate-200/40">
                {t('dashboard.noRecentConv')}
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => {
                  const ConvIcon =
                    conv.direction === 'sign_to_voice'
                      ? Video
                      : conv.mode?.toLowerCase().includes('learning')
                      ? GraduationCap
                      : MessageSquare;
                  const iconColor =
                    conv.direction === 'sign_to_voice'
                      ? 'text-[#7C9CFF]'
                      : conv.mode?.toLowerCase().includes('learning')
                      ? 'text-[#5ECB82]'
                      : 'text-[#FF8A8A]';

                  return (
                    <NavLink
                      key={conv.id}
                      to="/history"
                      className="p-3.5 rounded-2xl bg-white/60 hover:bg-white/90 flex items-center justify-between transition-colors border border-slate-200/40 group clay-focus"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100/80 flex items-center justify-center text-lg shrink-0 shadow-sm">
                          <ConvIcon className={`w-5 h-5 ${iconColor}`} />
                        </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#2B2D42] truncate group-hover:text-[#7C9CFF] transition-colors">
                          {conv.title}
                        </p>
                        <p className="text-[10px] font-bold text-[#6E7387] uppercase tracking-wider">
                          {conv.timestamp} • {conv.mode}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6E7387] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </NavLink>
                );
              })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-[#6E7387] font-semibold">
            <span>{isOffline ? t('common.offlineSaved') : t('dashboard.syncedSupabase')}</span>
            <span
              className={`${
                isOffline ? 'text-amber-600' : 'text-emerald-600'
              } font-bold flex items-center gap-1`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isOffline ? t('dashboard.offlineCache') : t('dashboard.upToDate')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Preferences / Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-[#2B2D42]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="clay-card p-7 w-full max-w-lg bg-[#E9EEF7] shadow-2xl relative animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#7C9CFF] text-white flex items-center justify-center shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#2B2D42]">{t('dashboard.prefsTitle')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/60 text-[#6E7387] hover:text-[#2B2D42] clay-focus"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                  {t('dashboard.voiceOutput')}
                </label>
                <select
                  value={settings.preferredVoice}
                  onChange={(e) => {
                    const updated = updateUserSettings({ preferredVoice: e.target.value });
                    setSettings(updated);
                  }}
                  className="clay-input w-full text-xs font-bold"
                >
                  <option value="Standard Male">{t('dashboard.voiceMale') || 'Standard Male (Deep Calm)'}</option>
                  <option value="Standard Female">{t('dashboard.voiceFemale') || 'Standard Female (Warm Friendly)'}</option>
                  <option value="Expressive Neutral">{t('dashboard.voiceNeutral') || 'Expressive Neutral'}</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-black text-[#2B2D42] mb-1.5">
                  <span>{t('signToVoice.speechSpeed')}</span>
                  <span>{settings.speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={settings.speechRate}
                  onChange={(e) => {
                    const updated = updateUserSettings({ speechRate: parseFloat(e.target.value) });
                    setSettings(updated);
                  }}
                  className="w-full accent-[#7C9CFF] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/60 border border-slate-200/50">
                <div>
                  <p className="text-xs font-black text-[#2B2D42]">{t('dashboard.hapticTitle')}</p>
                  <p className="text-[11px] text-[#6E7387]">{t('dashboard.hapticSub')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.hapticFeedback}
                  onChange={(e) => {
                    const updated = updateUserSettings({ hapticFeedback: e.target.checked });
                    setSettings(updated);
                  }}
                  className="w-4 h-4 rounded text-[#7C9CFF] focus:ring-[#7C9CFF] cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="clay-button w-full py-3 text-xs font-black clay-focus"
              >
                {t('dashboard.saveClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
