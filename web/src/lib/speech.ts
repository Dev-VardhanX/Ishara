import { useState, useEffect } from 'react';
import { tryPlayClipFallback, stopAudioClip } from './audioClips';

/**
 * Ishara Speech Service
 * Multilingual Web Speech API text-to-speech engine supporting all 10 Indian languages:
 * en-IN, hi-IN, bn-IN, mr-IN, ta-IN, te-IN, gu-IN, kn-IN, ml-IN, pa-IN.
 *
 * Key Features & Fixes:
 * 1. Async voice loading with 3s retry/poll (resolves empty voices list on Chrome startup).
 * 2. Case-insensitive and hyphen/underscore normalized matching.
 * 3. Exact matching first, then regional variants (e.g. bn-BD, ta-LK).
 * 4. STRICT PUNJABI RULE: pa-IN (Gurmukhi) never matches pa-PK (Shahmukhi).
 * 5. STRICT NON-ENGLISH RULE: Non-English text is NEVER assigned an English or foreign voice.
 * 6. Prefers local/offline voices (v.localService === true).
 * 7. Long text sentence boundary chunking.
 * 8. 1.5s watchdog timer with graceful fallback to bundled audio clips.
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
let voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null;

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
export function updateVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length > 0) {
    cachedVoices = voices;
    if (currentErrorMessage === 'No voice available in this browser. Try Chrome or Edge.') {
      currentErrorMessage = null;
    }
    notifySubscribers();
  }
  return cachedVoices;
}

/**
 * Robust async voice loader that listens for voiceschanged and retries up to 3000ms.
 */
export function waitForVoices(timeoutMs: number = 3000): Promise<SpeechSynthesisVoice[]> {
  if (cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }

  if (voicesLoadedPromise) {
    return voicesLoadedPromise;
  }

  voicesLoadedPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    // Try immediate read
    const immediate = window.speechSynthesis.getVoices();
    if (immediate && immediate.length > 0) {
      cachedVoices = immediate;
      resolve(cachedVoices);
      return;
    }

    let resolved = false;
    const startTime = Date.now();

    const cleanup = () => {
      resolved = true;
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
    };

    const onVoices = () => {
      if (resolved) return;
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
        cleanup();
        notifySubscribers();
        resolve(cachedVoices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoices);

    // Poll every 100ms in case voiceschanged does not fire
    const pollTimer = setInterval(() => {
      if (resolved) return;
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
        cleanup();
        notifySubscribers();
        resolve(cachedVoices);
      } else if (Date.now() - startTime >= timeoutMs) {
        cleanup();
        resolve(cachedVoices);
      }
    }, 100);

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve(cachedVoices);
      }
    }, timeoutMs);
  });

  return voicesLoadedPromise;
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
    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        updateVoices();
      };
    }
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      updateVoices();
    });
    // Kick off async wait in background
    waitForVoices(3000);
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
 *
 * Matching Rules:
 * 1. Exact match (e.g. 'hi-in' === 'hi-in') preferring localService.
 * 2. Language prefix match with another region (e.g. bn-BD, ta-LK) preferring localService.
 * 3. PUNJABI EXCEPTION: pa-IN must stay Gurmukhi (pa-IN / pa-Guru), NEVER match pa-PK (Shahmukhi).
 * 4. NEVER return an English or foreign voice for a non-English language! Return null.
 */
export function getBestVoice(targetLang: string = 'en-IN'): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    updateVoices();
  }

  if (cachedVoices.length === 0) {
    return null;
  }

  const normalized = targetLang.toLowerCase().replace(/_/g, '-').trim();
  const langCode = normalized.split('-')[0];

  // 1. Exact match (e.g. 'hi-in' or 'ta-in')
  const exactMatches = cachedVoices.filter(
    (v) => v.lang.toLowerCase().replace(/_/g, '-') === normalized
  );
  if (exactMatches.length > 0) {
    return exactMatches.find((v) => v.localService) || exactMatches[0];
  }

  // 2. Punjabi Exception: pa-IN must stay Gurmukhi; NEVER match pa-PK (Shahmukhi)
  if (langCode === 'pa') {
    const paMatches = cachedVoices.filter((v) => {
      const vLang = v.lang.toLowerCase().replace(/_/g, '-');
      const isPk = vLang.includes('pk');
      return (vLang === 'pa-in' || vLang.startsWith('pa-guru') || vLang === 'pa') && !isPk;
    });
    if (paMatches.length > 0) {
      return paMatches.find((v) => v.localService) || paMatches[0];
    }
    return null; // Do NOT fallback to English
  }

  // 3. Same language prefix with another region (e.g. bn-BD for bn-IN, ta-LK for ta-IN)
  const langMatches = cachedVoices.filter((v) => {
    const vLang = v.lang.toLowerCase().replace(/_/g, '-');
    const vCode = vLang.split('-')[0];
    return vCode === langCode;
  });

  if (langMatches.length > 0) {
    return langMatches.find((v) => v.localService) || langMatches[0];
  }

  // 4. If English was requested ('en-in' or 'en'), allow any English voice
  if (langCode === 'en') {
    const enMatches = cachedVoices.filter((v) =>
      v.lang.toLowerCase().replace(/_/g, '-').startsWith('en')
    );
    if (enMatches.length > 0) {
      return enMatches.find((v) => v.localService) || enMatches[0];
    }
  }

  // Non-English language with no matching voice: return null! Never assign English voice.
  return null;
}

/**
 * Returns all currently cached voices
 */
export function getAllVoices(): SpeechSynthesisVoice[] {
  if (cachedVoices.length === 0) {
    updateVoices();
  }
  return cachedVoices;
}

/**
 * Splits long text at natural sentence boundaries to prevent Chrome utterance timeout bug.
 */
function splitIntoSentences(text: string): string[] {
  if (text.length <= 160) return [text];
  const parts = text.split(/(?<=[.!?।\n])\s+/);
  return parts.filter((p) => p && p.trim().length > 0);
}

/**
 * Main Speak Function
 * Robustly executes text-to-speech with proper voice selection,
 * sentence chunking, unpausing, 1.5s watchdog timer, and audio clip fallback.
 */
export function speak(text: string, options: SpeakOptions = {}): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!text || !text.trim()) {
    return false;
  }

  // Mark user interaction if explicitly clicked
  if (options.isUserClick) {
    hasUserInteracted = true;
  }

  // Block auto-speak if user hasn't interacted yet
  if (options.isAutoSpeak && !hasUserInteracted) {
    console.warn('[Ishara Speech] Auto-speak blocked: user has not interacted yet. Click Speak once to enable.');
    return false;
  }

  const cleanedText = stripEmojisAndSymbols(text);
  if (!cleanedText) return false;

  const targetLang = (options.lang || 'en-IN').toLowerCase().replace(/_/g, '-');
  const langCode = targetLang.split('-')[0];
  const matchedVoice = getBestVoice(targetLang);

  // If no device voice exists for a non-English language, try audio clip fallback immediately
  if (!matchedVoice && langCode !== 'en') {
    tryPlayClipFallback(cleanedText, targetLang, {
      onStart: () => {
        isSpeakingState = true;
        notifySubscribers();
        options.onStart?.();
      },
      onEnd: () => {
        isSpeakingState = false;
        notifySubscribers();
        options.onEnd?.();
      },
      onError: (err) => {
        isSpeakingState = false;
        notifySubscribers();
        options.onError?.(err);
      },
    }).then((played) => {
      if (!played) {
        // Audio clip not available; proceed to attempt browser synthesis with utterance.lang
        attemptBrowserSpeak(cleanedText, targetLang, null, options);
      }
    });
    return true;
  }

  return attemptBrowserSpeak(cleanedText, targetLang, matchedVoice, options);
}

/**
 * Internal browser speech execution with sentence chunking & 1.5s watchdog
 */
function attemptBrowserSpeak(
  cleanedText: string,
  targetLang: string,
  voice: SpeechSynthesisVoice | null,
  options: SpeakOptions
): boolean {
  if (!('speechSynthesis' in window)) {
    currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
    notifySubscribers();
    options.onError?.('speechSynthesis not supported');
    return false;
  }

  try {
    stopSpeaking();
    window.speechSynthesis.resume();

    const sentences = splitIntoSentences(cleanedText);
    let currentIndex = 0;
    let watchdogTimer: any = null;
    let hasStarted = false;

    const speakNextChunk = () => {
      if (currentIndex >= sentences.length) {
        isSpeakingState = false;
        currentUtterance = null;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        notifySubscribers();
        options.onEnd?.();
        return;
      }

      const chunk = sentences[currentIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      currentUtterance = utterance;

      // Always set utterance.lang to the selected language code
      utterance.lang = targetLang;

      // Set utterance.voice ONLY if a matching voice for that language was found
      if (voice) {
        utterance.voice = voice;
      }

      // Apply volume and emotion presets
      const emotionPreset = options.emotion
        ? SPEECH_EMOTIONS[options.emotion] || SPEECH_EMOTIONS.neutral
        : SPEECH_EMOTIONS.neutral;

      utterance.volume = options.volume !== undefined ? options.volume : 1.0;
      utterance.pitch = options.pitch !== undefined ? options.pitch : emotionPreset.pitch;
      utterance.rate = options.rate !== undefined ? options.rate : emotionPreset.rate;

      // 1.5s Watchdog for the first chunk
      if (currentIndex === 0) {
        hasStarted = false;
        watchdogTimer = setTimeout(() => {
          if (isSpeakingState && !hasStarted) {
            console.warn(`[Ishara Speech] Watchdog: voice for ${targetLang} did not start within 1500ms`);
            window.speechSynthesis.cancel();
            isSpeakingState = false;
            notifySubscribers();

            // Run audio clip fallback on watchdog failure
            tryPlayClipFallback(cleanedText, targetLang, {
              onStart: options.onStart,
              onEnd: options.onEnd,
              onError: options.onError,
            }).then((played) => {
              if (!played) {
                currentErrorMessage = `Voice for ${targetLang.toUpperCase()} is unavailable on this device.`;
                notifySubscribers();
                options.onError?.(new Error(`Voice timeout for ${targetLang}`));
              }
            });
          }
        }, 1500);
      }

      utterance.onstart = () => {
        hasStarted = true;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        if (currentIndex === 0) {
          isSpeakingState = true;
          notifySubscribers();
          options.onStart?.();
        }
      };

      utterance.onend = () => {
        currentIndex++;
        speakNextChunk();
      };

      utterance.onerror = (event) => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
        isSpeakingState = false;
        currentUtterance = null;
        console.warn('[Ishara Speech] Utterance error:', event);

        // Attempt audio clip fallback on error
        tryPlayClipFallback(cleanedText, targetLang, {
          onStart: options.onStart,
          onEnd: options.onEnd,
          onError: options.onError,
        }).then((played) => {
          if (!played) {
            currentErrorMessage = `Voice for ${targetLang.toUpperCase()} is unavailable on this device.`;
            notifySubscribers();
            options.onError?.(event);
          }
        });
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk();
    return true;
  } catch (err) {
    isSpeakingState = false;
    currentUtterance = null;
    console.error('[Ishara Speech] speak error:', err);
    currentErrorMessage = 'No voice available in this browser. Try Chrome or Edge.';
    notifySubscribers();
    options.onError?.(err);
    return false;
  }
}

/**
 * Cancel any ongoing speech and audio clip playback
 */
export function stopSpeaking(): void {
  stopAudioClip();
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
