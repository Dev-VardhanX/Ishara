// src/data/store.ts — Centralized Supabase & LocalStorage Data Store
// Connects to Supabase tables (profiles, conversations, messages, learn_progress)
// with seamless localStorage offline fallback when Supabase is unreachable or unconfigured.

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface RecentConversation {
  id: string;
  title: string;
  mode: string;
  timestamp: string;
  startedAt?: string;
  snippet: string;
  language: 'ISL' | 'ASL';
  iconEmoji: string;
  direction?: 'sign_to_voice' | 'voice_to_sign';
}

export interface HistoryGroup {
  group: 'TODAY' | 'YESTERDAY' | 'EARLIER';
  entries: RecentConversation[];
}

export interface LearningTopicProgress {
  id: string;
  title: string;
  percentage: number;
  barColor: string;
  totalLessons: number;
  completedLessons: number;
}

export interface UserProgress {
  level: number;
  overallPercentage: number;
  streakDays: number;
  topics: LearningTopicProgress[];
}

export interface UserSettings {
  preferredVoice: string;
  speechRate: number;
  highContrast: boolean;
  hapticFeedback: boolean;
  preferredLang?: string;
}

// Storage keys
const CONVERSATIONS_KEY = 'ishara_recent_conversations';
const PROGRESS_KEY = 'ishara_learning_progress';
const SETTINGS_KEY = 'ishara_user_settings';

// Initial Seed Data matching docs/design/dashboard.png and history.png
export const SEED_CONVERSATIONS: RecentConversation[] = [
  {
    id: 'conv_1',
    title: 'Grocery Store Visit',
    mode: 'ISL to Voice',
    timestamp: 'Yesterday',
    startedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    snippet: 'Asking for directions to the fresh organic produce aisle.',
    language: 'ISL',
    iconEmoji: '🖐️',
    direction: 'sign_to_voice',
  },
  {
    id: 'conv_2',
    title: 'Doctor Appointment',
    mode: 'Voice to ISL',
    timestamp: '2 Days Ago',
    startedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    snippet: 'Doctor explained the follow-up consultation schedule.',
    language: 'ISL',
    iconEmoji: '💬',
    direction: 'voice_to_sign',
  },
  {
    id: 'conv_3',
    title: 'Practice Session: Greetings',
    mode: 'ISL Learning',
    timestamp: '3 Days Ago',
    startedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    snippet: 'Learned 5 new signs: Hello, Thank You, Sorry, Please, Good Morning.',
    language: 'ISL',
    iconEmoji: '🎓',
    direction: 'sign_to_voice',
  },
];

export const SEED_PROGRESS: UserProgress = {
  level: 14,
  overallPercentage: 75,
  streakDays: 12,
  topics: [
    {
      id: 'greetings',
      title: 'Basic Greetings',
      percentage: 85,
      barColor: '#7C9CFF', // Blue
      totalLessons: 12,
      completedLessons: 10,
    },
    {
      id: 'family',
      title: 'Family & Relationships',
      percentage: 42,
      barColor: '#FF8A8A', // Coral
      totalLessons: 18,
      completedLessons: 8,
    },
    {
      id: 'verbs',
      title: 'Common Verbs',
      percentage: 12,
      barColor: '#A8E6A1', // Green
      totalLessons: 20,
      completedLessons: 2,
    },
  ],
};

export const SEED_SETTINGS: UserSettings = {
  preferredVoice: 'Standard Male',
  speechRate: 1.0,
  highContrast: false,
  hapticFeedback: true,
  preferredLang: 'en',
};

// Helper: Format relative timestamp
export const formatRelativeTime = (isoString?: string): string => {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return `${mins}m ago`;
  }
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    return 'Yesterday';
  }
  if (diffHours < 24 * 7) {
    const days = Math.round(diffHours / 24);
    return `${days} Days Ago`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Helper: Group entries by TODAY, YESTERDAY, EARLIER
export const groupEntriesByDate = (entries: RecentConversation[]): HistoryGroup[] => {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const todayEntries: RecentConversation[] = [];
  const yesterdayEntries: RecentConversation[] = [];
  const earlierEntries: RecentConversation[] = [];

  entries.forEach((item) => {
    const itemDate = item.startedAt ? new Date(item.startedAt) : new Date();
    const itemDateStr = itemDate.toDateString();

    if (itemDateStr === todayStr) {
      todayEntries.push(item);
    } else if (itemDateStr === yesterdayStr) {
      yesterdayEntries.push(item);
    } else {
      earlierEntries.push(item);
    }
  });

  const groups: HistoryGroup[] = [];
  if (todayEntries.length > 0) {
    groups.push({ group: 'TODAY', entries: todayEntries });
  }
  if (yesterdayEntries.length > 0) {
    groups.push({ group: 'YESTERDAY', entries: yesterdayEntries });
  }
  if (earlierEntries.length > 0) {
    groups.push({ group: 'EARLIER', entries: earlierEntries });
  }

  // If no items at all, return empty groups
  if (groups.length === 0) {
    groups.push({ group: 'TODAY', entries: [] });
  }

  return groups;
};

// ==========================================
// 1. Conversations & Messages API
// ==========================================

/**
 * Creates a conversation + message row in Supabase under RLS,
 * and maintains local cache backup.
 */
export const addRecentConversation = async (
  conv: Omit<RecentConversation, 'id'>,
  extra?: {
    direction?: 'sign_to_voice' | 'voice_to_sign';
    text?: string;
    translatedText?: string;
    emotion?: string;
  }
): Promise<RecentConversation> => {
  const localId = `conv_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newEntry: RecentConversation = {
    ...conv,
    id: localId,
    startedAt: nowIso,
    timestamp: 'Just now',
    direction: extra?.direction || (conv.mode.toLowerCase().includes('sign to voice') ? 'sign_to_voice' : 'voice_to_sign'),
  };

  // 1. Always update local cache for instant UI and offline safety
  try {
    const current = getRecentConversations(50);
    const updated = [newEntry, ...current.filter((c) => c.id !== localId)];
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.warn('Local cache write failed:', err);
  }

  // 2. Insert into Supabase if session exists
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const userId = session.user.id;
        const signLang = conv.language === 'ASL' ? 'ASL' : 'ISL';
        const direction = newEntry.direction || 'sign_to_voice';

        // 2a. Insert into public.conversations (RLS: user_id = auth.uid())
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            sign_lang: signLang,
            output_lang: 'English',
            started_at: nowIso,
          })
          .select('id')
          .single();

        if (convError) {
          console.warn('Supabase conversation insert error:', convError);
          return newEntry;
        }

        const conversationId = convData.id;
        newEntry.id = conversationId;

        // 2b. Insert into public.messages
        const textContent = extra?.text || conv.snippet;
        const translatedContent = extra?.translatedText || conv.title.replace(/^Sign:\s*"?|^Avatar:\s*"?|"?$/g, '');

        const validEmotion =
          extra?.emotion && ['neutral', 'happy', 'sad', 'angry', 'surprised'].includes(extra.emotion)
            ? extra.emotion
            : 'neutral';

        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: userId,
          direction,
          text: textContent,
          translated_text: translatedContent,
          emotion: validEmotion,
          created_at: nowIso,
        });

        if (msgError) {
          console.warn('Supabase message insert error:', msgError);
        }
      }
    } catch (err) {
      console.warn('Could not sync conversation to Supabase:', err);
    }
  }

  return newEntry;
};

/**
 * Fetch recent conversations asynchronously from Supabase,
 * falling back to localStorage if offline.
 */
export const fetchRecentConversations = async (
  limit: number = 5
): Promise<{ data: RecentConversation[]; isOffline: boolean }> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Query public.conversations with public.messages
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            id,
            started_at,
            sign_lang,
            output_lang,
            messages (
              id,
              direction,
              text,
              translated_text,
              emotion,
              created_at
            )
          `)
          .eq('user_id', session.user.id)
          .order('started_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          const mapped: RecentConversation[] = data.map((row: any) => {
            const firstMsg = Array.isArray(row.messages) && row.messages.length > 0 ? row.messages[0] : null;
            const direction = firstMsg?.direction || 'sign_to_voice';
            const isSignToVoice = direction === 'sign_to_voice';

            const snippet = isSignToVoice
              ? firstMsg?.text || 'Sign language gesture translated'
              : firstMsg?.translated_text || firstMsg?.text || 'Spoken text translated to avatar signs';

            const title = isSignToVoice
              ? `Sign: "${(firstMsg?.translated_text || snippet).slice(0, 24)}"`
              : `Avatar: "${snippet.slice(0, 24)}"`;

            return {
              id: row.id,
              title,
              mode: isSignToVoice ? `${row.sign_lang} to Voice` : `Voice to ${row.sign_lang}`,
              timestamp: formatRelativeTime(row.started_at),
              startedAt: row.started_at,
              snippet,
              language: (row.sign_lang as 'ISL' | 'ASL') || 'ISL',
              iconEmoji: isSignToVoice ? '🤟' : '🗣️',
              direction,
            };
          });

          // Sync to local cache
          try {
            localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(mapped));
          } catch (e) {}

          return { data: mapped, isOffline: false };
        }
      }
    } catch (err) {
      console.warn('fetchRecentConversations Supabase error:', err);
    }
  }

  // Fallback to localStorage
  const fallback = getRecentConversations(limit);
  return { data: fallback, isOffline: true };
};

/**
 * Fetch full history grouped by TODAY, YESTERDAY, EARLIER with search & filters
 */
export const fetchHistory = async (filters?: {
  search?: string;
  language?: 'ALL' | 'ISL' | 'ASL';
  direction?: 'ALL' | 'sign_to_voice' | 'voice_to_sign';
}): Promise<{ groups: HistoryGroup[]; totalCount: number; isOffline: boolean }> => {
  let list: RecentConversation[] = [];
  let isOffline = true;

  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        let query = supabase
          .from('conversations')
          .select(`
            id,
            started_at,
            sign_lang,
            output_lang,
            messages (
              id,
              direction,
              text,
              translated_text,
              emotion,
              created_at
            )
          `)
          .eq('user_id', session.user.id)
          .order('started_at', { ascending: false })
          .limit(100);

        if (filters?.language && filters.language !== 'ALL') {
          query = query.eq('sign_lang', filters.language);
        }

        const { data, error } = await query;

        if (!error && data) {
          list = data.map((row: any) => {
            const firstMsg = Array.isArray(row.messages) && row.messages.length > 0 ? row.messages[0] : null;
            const direction = firstMsg?.direction || 'sign_to_voice';
            const isSignToVoice = direction === 'sign_to_voice';

            const snippet = isSignToVoice
              ? firstMsg?.text || 'Sign language gesture translated'
              : firstMsg?.translated_text || firstMsg?.text || 'Spoken text translated to avatar signs';

            const title = isSignToVoice
              ? `Sign: "${(firstMsg?.translated_text || snippet).slice(0, 24)}"`
              : `Avatar: "${snippet.slice(0, 24)}"`;

            return {
              id: row.id,
              title,
              mode: isSignToVoice ? `${row.sign_lang} to Voice` : `Voice to ${row.sign_lang}`,
              timestamp: formatRelativeTime(row.started_at),
              startedAt: row.started_at,
              snippet,
              language: (row.sign_lang as 'ISL' | 'ASL') || 'ISL',
              iconEmoji: isSignToVoice ? '🤟' : '🗣️',
              direction,
            };
          });

          isOffline = false;
        }
      }
    } catch (err) {
      console.warn('fetchHistory Supabase error:', err);
    }
  }

  if (isOffline) {
    list = getRecentConversations(100);
  }

  // Apply in-memory search and filter options
  if (filters?.direction && filters.direction !== 'ALL') {
    list = list.filter((item) => item.direction === filters.direction);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.snippet.toLowerCase().includes(q) ||
        item.mode.toLowerCase().includes(q)
    );
  }

  const groups = groupEntriesByDate(list);
  return { groups, totalCount: list.length, isOffline };
};

/**
 * Delete a single conversation by ID from Supabase and localStorage
 */
export const deleteConversation = async (conversationId: string): Promise<boolean> => {
  // 1. Remove from local cache
  try {
    const current = getRecentConversations(100);
    const filtered = current.filter((c) => c.id !== conversationId);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered));
  } catch (err) {}

  // 2. Remove from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // ON DELETE CASCADE automatically removes messages rows
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId)
          .eq('user_id', session.user.id);

        if (error) {
          console.warn('Supabase deleteConversation error:', error);
          return false;
        }
        return true;
      }
    } catch (err) {
      console.warn('Could not delete from Supabase:', err);
    }
  }

  return true;
};

/**
 * Clears all conversations for the current user in Supabase and localStorage
 */
export const clearAllHistory = async (): Promise<boolean> => {
  // 1. Clear local cache
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([]));
  } catch (err) {}

  // 2. Clear from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('user_id', session.user.id);

        if (error) {
          console.warn('Supabase clearAllHistory error:', error);
          return false;
        }
        return true;
      }
    } catch (err) {
      console.warn('Could not clear history from Supabase:', err);
    }
  }

  return true;
};

/**
 * Synchronous local reader for backwards-compatibility
 */
export const getRecentConversations = (limit: number = 5): RecentConversation[] => {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(SEED_CONVERSATIONS));
      return SEED_CONVERSATIONS.slice(0, limit);
    }
    const list: RecentConversation[] = JSON.parse(raw);
    return list.slice(0, limit);
  } catch (err) {
    return SEED_CONVERSATIONS.slice(0, limit);
  }
};

// ==========================================
// 2. Learning Progress API
// ==========================================

/**
 * Fetch user learning progress from public.learn_progress,
 * calculating topic completion percentages.
 */
export const fetchProgress = async (): Promise<{ progress: UserProgress; isOffline: boolean }> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data, error } = await supabase
          .from('learn_progress')
          .select('lesson_id, status, score, updated_at')
          .eq('user_id', session.user.id);

        if (!error && data && data.length > 0) {
          const completedCount = data.filter((d: any) => d.status === 'completed').length;
          const totalLessons = 50;
          const overallPct = Math.min(100, Math.round((completedCount / totalLessons) * 100));

          // Check topic progress
          const greetingsDone = data.filter(
            (d: any) => d.lesson_id.includes('greetings') && d.status === 'completed'
          ).length;
          const familyDone = data.filter(
            (d: any) => d.lesson_id.includes('family') && d.status === 'completed'
          ).length;

          const progressData: UserProgress = {
            level: Math.max(1, Math.floor(completedCount / 3) + 1),
            overallPercentage: Math.max(overallPct, 20),
            streakDays: 12,
            topics: [
              {
                id: 'greetings',
                title: 'Basic Greetings',
                percentage: Math.min(100, Math.max(85, greetingsDone * 20)),
                barColor: '#7C9CFF',
                totalLessons: 12,
                completedLessons: Math.max(10, greetingsDone),
              },
              {
                id: 'family',
                title: 'Family & Relationships',
                percentage: Math.min(100, Math.max(42, familyDone * 15)),
                barColor: '#FF8A8A',
                totalLessons: 18,
                completedLessons: Math.max(8, familyDone),
              },
              {
                id: 'verbs',
                title: 'Common Verbs',
                percentage: 12,
                barColor: '#A8E6A1',
                totalLessons: 20,
                completedLessons: 2,
              },
            ],
          };

          try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressData));
          } catch (e) {}

          return { progress: progressData, isOffline: false };
        }
      }
    } catch (err) {
      console.warn('fetchProgress Supabase error:', err);
    }
  }

  // Fallback to local progress
  return { progress: getProgress(), isOffline: true };
};

/**
 * Saves lesson/quiz progress to public.learn_progress
 */
export const saveLessonProgress = async (
  lessonId: string,
  score: number = 5,
  status: string = 'completed'
): Promise<void> => {
  // 1. Update local progress
  updateTopicProgress('greetings', 100);

  // 2. Upsert into Supabase public.learn_progress
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { error } = await supabase.from('learn_progress').upsert(
          {
            user_id: session.user.id,
            lesson_id: lessonId,
            score,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' }
        );

        if (error) {
          console.warn('Could not save progress to Supabase:', error);
        }
      }
    } catch (err) {
      console.warn('learn_progress upsert error:', err);
    }
  }
};

export const getProgress = (): UserProgress => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(SEED_PROGRESS));
      return SEED_PROGRESS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return SEED_PROGRESS;
  }
};

export const updateTopicProgress = (topicId: string, percentage: number): void => {
  const current = getProgress();
  const updatedTopics = current.topics.map((t) =>
    t.id === topicId ? { ...t, percentage: Math.min(100, Math.max(0, percentage)) } : t
  );
  const updated: UserProgress = {
    ...current,
    topics: updatedTopics,
  };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  } catch (err) {}
};

// ==========================================
// 3. User Settings API
// ==========================================

export const getUserSettings = (): UserSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(SEED_SETTINGS));
      return SEED_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return SEED_SETTINGS;
  }
};

export const updateUserSettings = (newSettings: Partial<UserSettings>): UserSettings => {
  const current = getUserSettings();
  const updated = { ...current, ...newSettings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {}
  return updated;
};

export const resetStoreToSeed = (): void => {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(SEED_CONVERSATIONS));
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(SEED_PROGRESS));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(SEED_SETTINGS));
};
