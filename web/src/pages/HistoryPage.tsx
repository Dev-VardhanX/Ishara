// src/pages/HistoryPage.tsx — Conversation History with Supabase, Search, Filters, and RLS
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import {
  fetchHistory,
  deleteConversation,
  clearAllHistory,
  HistoryGroup,
  RecentConversation,
} from '../data/store';
import {
  Search,
  Filter,
  Trash2,
  HandMetal,
  MessageSquare,
  GraduationCap,
  Sparkles,
  CloudOff,
  CheckCircle,
  X,
  ChevronDown,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [historyGroups, setHistoryGroups] = useState<HistoryGroup[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'ALL' | 'ISL' | 'ASL'>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<'ALL' | 'sign_to_voice' | 'voice_to_sign'>('ALL');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Delete & Confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { groups, totalCount: count, isOffline: offline } = await fetchHistory({
        search: searchTerm,
        language: selectedLanguage,
        direction: selectedDirection,
      });
      setHistoryGroups(groups);
      setTotalCount(count);
      setIsOffline(offline);
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedLanguage, selectedDirection]);

  useEffect(() => {
    document.title = 'Translation History — Ishara';
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteConversation(id);
      await loadHistory();
    } catch (err) {
      console.warn('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllConfirm = async () => {
    setIsClearingAll(true);
    try {
      await clearAllHistory();
      await loadHistory();
      setConfirmClearOpen(false);
    } catch (err) {
      console.warn('Clear all failed:', err);
    } finally {
      setIsClearingAll(false);
    }
  };

  // Helper icon generator
  const getIconDetails = (item: RecentConversation) => {
    if (item.mode.includes('Learning') || item.iconEmoji === '🎓') {
      return {
        icon: GraduationCap,
        bgClass: 'bg-[#E5F8E2] text-[#65B75D]',
      };
    }
    if (item.direction === 'voice_to_sign' || item.mode.includes('Voice to')) {
      return {
        icon: MessageSquare,
        bgClass: 'bg-[#FFE8E2] text-[#FF8A8A]',
      };
    }
    return {
      icon: HandMetal,
      bgClass: 'bg-[#7C9CFF]/20 text-[#7C9CFF]',
    };
  };

  return (
    <div className="space-y-6 select-none">
      <Header
        title="Conversation History"
        subtitle="Review, search, and manage your past translation conversations."
      />

      {/* Sync Status & Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {isOffline ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFE8E2] border border-[#FFB59E] text-xs font-black text-[#2B2D42] shadow-sm">
              <CloudOff className="w-3.5 h-3.5 text-[#FF8A8A]" />
              <span>Offline, saved on this device</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-black text-[#2B2D42] shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 text-[#A8E6A1]" />
              <span>SUPABASE SYNCED ({totalCount} entries)</span>
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="clay-button clay-button-white px-4 py-2 text-xs font-black flex items-center gap-2 clay-focus text-[#FF8A8A] hover:bg-[#FFE8E2]/50"
            title="Clear all saved history"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations, keywords, or glosses..."
              className="clay-input w-full pl-11 pr-10 text-xs font-bold"
            />
            <Search className="w-4 h-4 text-[#6E7387] absolute left-4 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E7387] hover:text-[#2B2D42]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`clay-button px-4 py-3 text-xs font-extrabold flex items-center gap-2 clay-focus ${
              showFilters || selectedLanguage !== 'ALL' || selectedDirection !== 'ALL'
                ? 'clay-button-coral'
                : 'clay-button-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>
              Filters
              {selectedLanguage !== 'ALL' || selectedDirection !== 'ALL' ? ' (Active)' : ''}
            </span>
          </button>
        </div>

        {/* Filter Options Strip */}
        {showFilters && (
          <div className="clay-card p-4 bg-white/90 flex flex-wrap items-center justify-between gap-4 animate-fade-in border border-slate-200/80">
            {/* Language filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[#6E7387]">Language:</span>
              {(['ALL', 'ISL', 'ASL'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all clay-focus ${
                    selectedLanguage === lang
                      ? 'bg-[#7C9CFF] text-white shadow-sm'
                      : 'bg-slate-100 text-[#6E7387] hover:bg-slate-200'
                  }`}
                >
                  {lang === 'ALL' ? 'All Languages' : lang}
                </button>
              ))}
            </div>

            {/* Direction filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[#6E7387]">Mode:</span>
              {[
                { id: 'ALL', label: 'All Modes' },
                { id: 'sign_to_voice', label: 'Sign to Voice' },
                { id: 'voice_to_sign', label: 'Voice to Sign' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedDirection(item.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all clay-focus ${
                    selectedDirection === item.id
                      ? 'bg-[#FF8A8A] text-white shadow-sm'
                      : 'bg-slate-100 text-[#6E7387] hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="clay-card p-5 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-slate-200 rounded"></div>
                  <div className="h-3 w-64 bg-slate-200 rounded"></div>
                </div>
              </div>
              <div className="h-3 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* History Items Groups */}
      {!loading && (
        <div className="space-y-6 pt-2">
          {historyGroups.every((g) => g.entries.length === 0) ? (
            <div className="clay-card p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white/70">
              <div className="w-16 h-16 rounded-3xl bg-[#7C9CFF]/15 flex items-center justify-center text-3xl">
                ⏱️
              </div>
              <h3 className="text-base font-extrabold text-[#2B2D42]">No Conversations Found</h3>
              <p className="text-xs text-[#6E7387] max-w-sm">
                {searchTerm
                  ? `No entries match "${searchTerm}". Try adjusting your filters.`
                  : 'Start translating with Sign to Voice or Voice to Sign to record your activity.'}
              </p>
            </div>
          ) : (
            historyGroups.map((group) => {
              if (group.entries.length === 0) return null;

              return (
                <div key={group.group} className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#6E7387]">
                    {group.group}
                  </span>

                  <div className="space-y-3">
                    {group.entries.map((item) => {
                      const { icon: IconComp, bgClass } = getIconDetails(item);

                      return (
                        <div
                          key={item.id}
                          className="clay-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:-translate-y-0.5 transition-transform relative overflow-hidden"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgClass} shrink-0 shadow-sm`}>
                              <IconComp className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-sm text-[#2B2D42] truncate">
                                  {item.title}
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-[#6E7387]">
                                  {item.mode}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-[#7C9CFF]/15 text-[#7C9CFF] text-[9px] font-black uppercase">
                                  {item.language}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[#6E7387] italic mt-1 truncate">
                                "{item.snippet}"
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                            <span className="text-xs font-black text-[#6E7387]">
                              {item.timestamp}
                            </span>

                            {/* Delete single conversation */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteOne(e, item.id)}
                              disabled={deletingId === item.id}
                              className="opacity-80 sm:opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-[#FF8A8A] hover:bg-red-50 rounded-xl transition-all clay-focus"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="clay-card p-6 max-w-sm w-full bg-white space-y-4 shadow-clay-raised">
            <div className="flex items-center gap-3 text-[#FF8A8A]">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-black text-[#2B2D42]">Clear All History?</h3>
            </div>
            <p className="text-xs text-[#6E7387] font-semibold leading-relaxed">
              This will permanently delete your entire conversation history across all devices. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="clay-button clay-button-white px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllConfirm}
                disabled={isClearingAll}
                className="clay-button clay-button-coral px-4 py-2 text-xs font-black"
              >
                {isClearingAll ? 'Clearing...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
