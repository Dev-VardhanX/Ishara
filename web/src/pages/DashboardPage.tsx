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
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguageStore();

  // Local & Supabase data store state
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Set document title
  useEffect(() => {
    document.title = 'Dashboard — Ishara';
  }, []);

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
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Ananya';
  const userEmail = user?.email;

  // 5 Feature Cards strictly matching requirements
  const featureCards = [
    {
      id: 'sign-to-voice',
      title: 'Sign to Voice',
      desc: 'Real-time camera translation for ISL gestures into text and audio.',
      actionText: 'Open Translator',
      link: '/sign-to-voice',
      icon: Video,
      iconColor: 'text-[#7C9CFF]',
      hasAsl: false,
    },
    {
      id: 'voice-to-sign',
      title: 'Voice to Sign',
      desc: 'Input text or voice and see our 3D avatar perform the translation.',
      actionText: 'View Avatar',
      link: '/voice-to-sign',
      icon: MessageSquare,
      iconColor: 'text-[#FF8A8A]',
      hasAsl: true,
    },
    {
      id: 'learn-sign',
      title: 'Learn Sign',
      desc: 'Master Indian Sign Language with interactive daily lessons.',
      actionText: 'Continue Lesson',
      link: '/learn',
      icon: GraduationCap,
      iconColor: 'text-[#5ECB82]',
      hasAsl: false,
    },
    {
      id: 'history',
      title: 'History',
      desc: 'Review your past translations and saved conversations.',
      actionText: 'See Activity',
      link: '/history',
      icon: HistoryIcon,
      iconColor: 'text-[#B39DDB]',
      hasAsl: true,
    },
    {
      id: 'settings',
      title: 'Settings',
      desc: 'Customize accessibility, voice types, and profile details.',
      actionText: 'Preferences & Account',
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
            ? `${userEmail} • Ready to break some barriers today with ${language}?`
            : `Ready to break some barriers today with ${language}?`
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
                      Coming soon
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
                <h3 className="text-lg font-black text-[#2B2D42]">Learning Progress</h3>
                <p className="text-xs font-semibold text-[#6E7387]">
                  Mastery across current sign vocabulary modules
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#E2EBFF] text-[#7C9CFF] text-xs font-black uppercase tracking-wider shadow-sm">
                Level {progress?.level || 14}
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
              Current Streak: <strong className="text-[#FF8A8A]">{progress?.streakDays || 12} Days 🔥</strong>
            </span>
            <NavLink
              to="/learn"
              className="text-xs font-black text-[#7C9CFF] hover:underline flex items-center gap-1"
            >
              <span>Go to Lessons</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </div>

        {/* Recent Conversations Card */}
        <div className="lg:col-span-5 clay-card p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-[#2B2D42]">Recent Conversations</h3>
                <p className="text-xs font-semibold text-[#6E7387]">
                  Quick access to translation transcripts
                </p>
              </div>
              <NavLink
                to="/history"
                className="text-xs font-black text-[#7C9CFF] hover:underline"
              >
                View All
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
                No recent conversations recorded yet. Start translating to see activity here!
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
            <span>{isOffline ? 'Offline, saved on this device' : 'Synced with Supabase Cloud'}</span>
            <span
              className={`${
                isOffline ? 'text-amber-600' : 'text-emerald-600'
              } font-bold flex items-center gap-1`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isOffline ? 'Offline Cache' : 'Up to date'}</span>
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
                <h3 className="text-lg font-black text-[#2B2D42]">Translator Preferences</h3>
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
                  Voice Synthesis Output
                </label>
                <select
                  value={settings.preferredVoice}
                  onChange={(e) => {
                    const updated = updateUserSettings({ preferredVoice: e.target.value });
                    setSettings(updated);
                  }}
                  className="clay-input w-full text-xs font-bold"
                >
                  <option value="Standard Male">Standard Male (Deep Calm)</option>
                  <option value="Standard Female">Standard Female (Warm Friendly)</option>
                  <option value="Expressive Neutral">Expressive Neutral</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-black text-[#2B2D42] mb-1.5">
                  <span>Speech Rate</span>
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
                  <p className="text-xs font-black text-[#2B2D42]">Haptic / Audio Chimes</p>
                  <p className="text-[11px] text-[#6E7387]">Play soft cues when sign recognition locks</p>
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
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
