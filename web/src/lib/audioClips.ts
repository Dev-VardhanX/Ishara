/**
 * web/src/lib/audioClips.ts — Offline Bundled Audio Clip Fallback System
 * Priority 1: 6 Emergency phrases in all 10 languages (60 clips)
 * Priority 2: 20 Sign words in all 10 languages (200 clips)
 * Total: 260 clips under public/audio/<lang>/<id>.mp3
 *
 * Speech Order:
 * 1. Device voice (Web Speech API)
 * 2. Bundled audio clip (single word or exact phrase; sequenced for multi-sign phrases)
 * 3. Visual text only with gentle notice
 */

import { AppLocale } from '../store/useLocaleStore';
import { getLoadedLexicon } from '../data/lexicons';

export interface AudioClipMeta {
  id: string;
  category: 'emergency' | 'sign';
  lang: string;
  text: string;
  path: string;
}

// In-memory cache of loaded manifest
let clipManifest: Record<string, boolean> | null = null;
let currentAudio: HTMLAudioElement | null = null;

/**
 * Loads the manifest of available audio clips from /audio/manifest.json
 */
export async function loadClipManifest(): Promise<Record<string, boolean>> {
  if (clipManifest) return clipManifest;
  try {
    const res = await fetch('/audio/manifest.json');
    if (res.ok) {
      clipManifest = await res.json();
    } else {
      clipManifest = {};
    }
  } catch {
    clipManifest = {};
  }
  return clipManifest || {};
}

/**
 * Checks if a specific clip file is marked available in manifest
 */
export function hasClip(lang: string, clipId: string): boolean {
  if (!clipManifest) return false;
  const key = `${lang}/${clipId}`;
  return !!clipManifest[key];
}

/**
 * Stop any ongoing audio clip playback
 */
export function stopAudioClip(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
}

/**
 * Plays a single audio file with start, end, and error callbacks
 */
export function playAudioFile(
  url: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    stopAudioClip();
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onplay = () => {
      onStart?.();
    };

    audio.onended = () => {
      currentAudio = null;
      onEnd?.();
      resolve(true);
    };

    audio.onerror = (e) => {
      currentAudio = null;
      onError?.(e);
      resolve(false);
    };

    audio.play().catch((err) => {
      currentAudio = null;
      onError?.(err);
      resolve(false);
    });
  });
}

/**
 * Plays a sequence of audio clips one after another (for multi-sign sentences)
 */
export async function playAudioSequence(
  urls: string[],
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<boolean> {
  if (urls.length === 0) return false;
  onStart?.();

  for (let i = 0; i < urls.length; i++) {
    const success = await playAudioFile(urls[i]);
    if (!success) {
      onError?.(new Error(`Failed to play clip at ${urls[i]}`));
      return false;
    }
  }

  onEnd?.();
  return true;
}

const EMERGENCY_MAP: Record<string, string> = {
  'i need help': 'emergency_help',
  'please call the police': 'emergency_police',
  'i am not safe, please stay with me': 'emergency_not_safe',
  'i need a doctor / ambulance': 'emergency_medical',
  'i cannot hear or speak, please read my screen': 'emergency_communication',
  'please call my family': 'emergency_family',
};

/**
 * Attempts to play an audio clip fallback for a given text or gloss in a specific language.
 * Returns true if an audio clip was found and played, false otherwise.
 */
export async function tryPlayClipFallback(
  text: string,
  lang: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<boolean> {
  const norm = (text || '').trim().toLowerCase();
  const langKey = lang.split('-')[0];

  // 1. Check if it's an emergency phrase ID or key
  if (EMERGENCY_MAP[norm]) {
    const clipUrl = `/audio/${langKey}/${EMERGENCY_MAP[norm]}.mp3`;
    return playAudioFile(clipUrl, callbacks?.onStart, callbacks?.onEnd, callbacks?.onError);
  }

  // 2. Check direct emergency phrase key
  if (norm.startsWith('emergency_')) {
    const clipUrl = `/audio/${langKey}/${norm}.mp3`;
    return playAudioFile(clipUrl, callbacks?.onStart, callbacks?.onEnd, callbacks?.onError);
  }

  // 3. Check single sign gloss ID (e.g. HELLO, THANK_YOU)
  const upperNorm = norm.toUpperCase().replace(/\s+/g, '_');
  const singleGlossUrl = `/audio/${langKey}/sign_${upperNorm}.mp3`;
  const playedSingle = await playAudioFile(
    singleGlossUrl,
    callbacks?.onStart,
    callbacks?.onEnd,
    callbacks?.onError
  );
  if (playedSingle) return true;

  // 4. Check lexicon to see if the phrase corresponds to a sign gloss
  const lexicon = getLoadedLexicon(langKey as AppLocale);
  if (lexicon && lexicon.glosses) {
    for (const [glossId, entry] of Object.entries(lexicon.glosses)) {
      if (entry.main.toLowerCase() === norm || (entry.alternatives && entry.alternatives.some((a) => a.toLowerCase() === norm))) {
        const url = `/audio/${langKey}/sign_${glossId}.mp3`;
        return playAudioFile(url, callbacks?.onStart, callbacks?.onEnd, callbacks?.onError);
      }
    }
  }

  return false;
}
