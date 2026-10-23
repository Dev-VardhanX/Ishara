// src/data/store.ts — Centralized LocalStorage Data Store for Ishara
// Encapsulates data layer so it can be swapped seamlessly for Supabase queries later.

export interface RecentConversation {
  id: string;
  title: string;
  mode: string;
  timestamp: string;
  snippet: string;
  language: 'ISL' | 'ASL';
  iconEmoji: string;
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
}

// Storage keys
const CONVERSATIONS_KEY = 'ishara_recent_conversations';
const PROGRESS_KEY = 'ishara_learning_progress';
const SETTINGS_KEY = 'ishara_user_settings';

// Initial Seed Data matching docs/design/dashboard.png and history.png
const SEED_CONVERSATIONS: RecentConversation[] = [
  {
    id: 'conv_1',
    title: 'Grocery Store Visit',
    mode: 'ISL to Voice',
    timestamp: 'Yesterday',
    snippet: 'Asking for directions to the fresh organic produce aisle.',
    language: 'ISL',
    iconEmoji: '🖐️',
  },
  {
    id: 'conv_2',
    title: 'Doctor Appointment',
    mode: 'Hindi to ISL',
    timestamp: '2 Days Ago',
    snippet: 'Doctor explained the follow-up consultation schedule.',
    language: 'ISL',
    iconEmoji: '💬',
  },
  {
    id: 'conv_3',
    title: 'Practice Session: Greetings',
    mode: 'ISL Learning',
    timestamp: '3 Days Ago',
    snippet: 'Learned 5 new signs: Hello, Thank You, Sorry, Please, Good Morning.',
    language: 'ISL',
    iconEmoji: '🎓',
  },
];

const SEED_PROGRESS: UserProgress = {
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

const SEED_SETTINGS: UserSettings = {
  preferredVoice: 'Standard Male',
  speechRate: 1.0,
  highContrast: false,
  hapticFeedback: true,
};

// --- Data Access Functions ---

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
    console.warn('Failed to read conversations from localStorage', err);
    return SEED_CONVERSATIONS.slice(0, limit);
  }
};

export const addRecentConversation = (
  conv: Omit<RecentConversation, 'id'>
): RecentConversation => {
  const current = getRecentConversations(50);
  const newEntry: RecentConversation = {
    ...conv,
    id: `conv_${Date.now()}`,
  };
  const updated = [newEntry, ...current];
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save conversation to localStorage', err);
  }
  return newEntry;
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
    console.warn('Failed to read progress from localStorage', err);
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
  } catch (err) {
    console.warn('Failed to save progress to localStorage', err);
  }
};

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
  } catch (err) {
    console.warn('Failed to save settings to localStorage', err);
  }
  return updated;
};

export const resetStoreToSeed = (): void => {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(SEED_CONVERSATIONS));
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(SEED_PROGRESS));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(SEED_SETTINGS));
};
