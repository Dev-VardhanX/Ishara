import { useState, useEffect } from 'react';

/**
 * Ishara Speech Service
 * Robust Web Speech API text-to-speech helper with voice caching,
 * emotion modulation, gesture/auto-speak gating, and fallback error handling.
 */


export type SpeechEmotion = 'happy' | 'neutral' | 'sad' | 'angry' | 'surprised';

export interface EmotionPreset {
  name: string;
  iconName: string;
  emoji?: string;
  pitch: number;
  rate: number;
  volume: number;
}

export const SPEECH_EMOTIONS: Record<SpeechEmotion, EmotionPreset> = {
  happy: { name: 'Happy', iconName: 'smile', pitch: 1.2, rate: 1.1, volume: 1.0 },
  neutral: { name: 'Neutral', iconName: 'minus', pitch: 1.0, rate: 1.0, volume: 1.0 },
  sad: { name: 'Sad', iconName: 'frown', pitch: 0.8, rate: 0.85, volume: 1.0 },
  angry: { name: 'Angry', iconName: 'alert-circle', pitch: 1.0, rate: 1.15, volume: 1.0 },
  surprised: { name: 'Surprised', iconName: 'sparkles', pitch: 1.3, rate: 1.1, volume: 1.0 },
};

export interface SpeakOptions {
  emotion?: SpeechEmotion;
  pitch?: number;
  rate?: number;
  volume?: number;
  lang?: string;
  isAutoSpeak?: boolean;
  isUserClick?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface SpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  errorMessage: string | null;
  voiceCount: number;
  hasUserInteracted: boolean;
}

// Module-level persistent references
let cachedVoices: SpeechSynthesisVoice[] = [];
let currentUtterance: SpeechSynthesisUtterance | null = null;
let hasUserInteracted = false;
let isSpeakingState = false;
let currentErrorMessage: string | null = null;

// Subscribers for React state hooks
type SpeechSubscriber = (state: SpeechState) => void;
const subscribers = new Set<SpeechSubscriber>();

function notifySubscribers() {
  const state = getSpeechStatus();
  subscribers.forEach((fn) => fn(state));
}

export function getSpeechStatus(): SpeechState {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  return {
    isSupported,
    isSpeaking: isSpeakingState,
    errorMessage: currentErrorMessage,
    voiceCount: cachedVoices.length,
    hasUserInteracted,
  };
}

export function subscribeSpeechState(callback: SpeechSubscriber): () => void {
  subscribers.add(callback);
  callback(getSpeechStatus());
  return () => {
    subscribers.delete(callback);
  };
}

export function clearSpeechError(): void {
  currentErrorMessage = null;
  notifySubscribers();
}

export function recordUserInteraction(): void {
  if (!hasUserInteracted) {
    hasUserInteracted = true;
    notifySubscribers();
  }
}

/**
 * Update and cache available browser voices
 */
function updateVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices() || [];
  cachedVoices = voices;

  if (cachedVoices.length === 0) {
    // If voices are empty after initial load attempt, notify
    currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
  } else if (currentErrorMessage === 'No voice available in this browser. Try Chrome or Edge.') {
    currentErrorMessage = null;
  }

  notifySubscribers();
  return cachedVoices;
}

// Auto-register interaction listeners and load voices on module evaluation
if (typeof window !== 'undefined') {
  const registerClick = () => {
    hasUserInteracted = true;
    notifySubscribers();
    window.removeEventListener('pointerdown', registerClick);
    window.removeEventListener('keydown', registerClick);
  };
  window.addEventListener('pointerdown', registerClick, { once: true });
  window.addEventListener('keydown', registerClick, { once: true });

  if ('speechSynthesis' in window) {
    // First immediate load attempt
    updateVoices();

    // Listen to async voiceschanged event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        updateVoices();
      };
    }
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      updateVoices();
    });
  } else {
    currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
  }
}

/**
 * Strips all emoji characters, icons, and non-verbal punctuation symbols
 * so text-to-speech engines never vocalize them aloud.
 */
export function stripEmojisAndSymbols(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[•_—*#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pick a voice matching the target language code, supporting all Indian languages:
 * en-IN, hi-IN, bn-IN, mr-IN, ta-IN, te-IN, gu-IN, kn-IN, ml-IN, pa-IN.
 * Falls back gracefully to English or available system voice.
 */
export function getBestVoice(targetLang: string = 'en-IN'): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    updateVoices();
  }

  if (cachedVoices.length === 0) {
    return null;
  }

  const normalized = targetLang.toLowerCase().replace('_', '-');
  const langPrefix = normalized.split('-')[0];

  // 1. Exact match with target lang (e.g., 'hi-in' or 'en-in')
  let match = cachedVoices.find(
    (v) => v.lang.toLowerCase().replace('_', '-') === normalized
  );

  // 2. Language prefix match (e.g., any Hindi 'hi', Bengali 'bn', Tamil 'ta', etc.)
  if (!match) {
    match = cachedVoices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix)
    );
  }

  // 3. Indian English fallback if an Indian voice was requested but missing on host OS
  if (!match && normalized !== 'en-in' && !normalized.startsWith('en')) {
    match = cachedVoices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').includes('en-in')
    );
  }

  // 4. Any English voice
  if (!match) {
    match = cachedVoices.find((v) =>
      v.lang.toLowerCase().startsWith('en')
    );
  }

  // 5. Fall back to the first available voice
  const chosen = match || cachedVoices[0] || null;

  return chosen;
}

/**
 * Main Speak Function
 * Robustly executes text-to-speech with proper voice selection,
 * unpausing, utterance lifecycle management, and error handling.
 */
export function speak(text: string, options: SpeakOptions = {}): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
    notifySubscribers();
    options.onError?.('speechSynthesis not supported');
    return false;
  }

  if (!text || !text.trim()) {
    return false;
  }

  // User interaction gating:
  // If this is an explicit user click (e.g. Speak button), mark user interaction
  if (options.isUserClick) {
    hasUserInteracted = true;
  }

  // If this is an auto-speak call and user hasn't interacted yet, do not speak
  if (options.isAutoSpeak && !hasUserInteracted) {
    console.warn('[Ishara Speech] Auto-speak blocked: user has not interacted yet. Click Speak once to enable.');
    return false;
  }

  try {
    // 3. Before speaking, call cancel() and resume() (resolves Chrome idle pause issue)
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    // Ensure voices are loaded
    if (cachedVoices.length === 0) {
      updateVoices();
    }

    if (cachedVoices.length === 0) {
      currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
      console.error('[Ishara Speech] onerror event: empty voices list');
      notifySubscribers();
      options.onError?.('No voice available in this browser. Try Chrome or Edge.');
      return false;
    }

    // 4. Sanitize text so emojis and symbols are never spoken aloud
    const cleanedText = stripEmojisAndSymbols(text);
    if (!cleanedText) {
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    currentUtterance = utterance;

    // Pick voice
    const voice = getBestVoice(options.lang || 'en-IN');
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    // 5. Apply volume = 1 and emotion presets (pitch and rate)
    const emotionPreset = options.emotion
      ? SPEECH_EMOTIONS[options.emotion] || SPEECH_EMOTIONS.neutral
      : SPEECH_EMOTIONS.neutral;

    utterance.volume = options.volume !== undefined ? options.volume : 1.0;
    utterance.pitch = options.pitch !== undefined ? options.pitch : emotionPreset.pitch;
    utterance.rate = options.rate !== undefined ? options.rate : emotionPreset.rate;

    isSpeakingState = true;
    notifySubscribers();
    options.onStart?.();

    utterance.onend = () => {
      isSpeakingState = false;
      currentUtterance = null;
      notifySubscribers();
      options.onEnd?.();
    };

    utterance.onerror = (event) => {
      isSpeakingState = false;
      currentUtterance = null;
      // 8. Log onerror events
      console.error('[Ishara Speech] onerror event:', event);
      // 7. Show visible error message
      currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
      notifySubscribers();
      options.onError?.(event);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    isSpeakingState = false;
    currentUtterance = null;
    console.error('[Ishara Speech] onerror event:', err);
    currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
    notifySubscribers();
    options.onError?.(err);
    return false;
  }
}

/**
 * Cancel any ongoing speech
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    isSpeakingState = false;
    currentUtterance = null;
    notifySubscribers();
  }
}

/**
 * React Hook for easy integration across components
 */
export function useSpeech() {
  const [status, setStatus] = useState<SpeechState>(() => getSpeechStatus());

  useEffect(() => {
    return subscribeSpeechState(setStatus);
  }, []);

  return {
    ...status,
    clearError: clearSpeechError,
    speak: (text: string, options?: SpeakOptions) => speak(text, options),
    stop: stopSpeaking,
    recordInteraction: recordUserInteraction,
  };
}

