// src/ml/demoRecognizer.ts — Interactive Scripted Demo Recognizer
// Implements Recognizer interface with 1.2s steady hand detection,
// 250ms per word progressive reveal, gesture-to-phrase mapping,
// 2-second cooldown with hand-leave requirement, and 1-9 presenter shortcuts.

import { Landmark, RecognitionResult, Recognizer } from '../lib/recognizer';
import { DEMO_PHRASES, DemoPhrase, GESTURE_TO_PHRASE_INDEX } from './demoPhrases';

export type DetectedGesture = 'open_palm' | 'thumbs_up' | 'fist' | 'pointing' | 'ok_sign' | 'steady';

export interface DemoRecognizerCallbacks {
  onWordRevealed?: (word: string, currentText: string, phrase: DemoPhrase) => void;
  onPhraseCompleted?: (phrase: DemoPhrase, fullText: string) => void;
  onProgressUpdated?: (progress: number) => void;
}

const WRIST = 0;
const THUMB_MCP = 2;
const THUMB_TIP = 4;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

const dist = (a: Landmark, b: Landmark): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

export class DemoRecognizer implements Recognizer {
  public name = 'Scripted Demo Recognizer (v1)';

  private cycleIndex: number = 0;
  private steadyStartTime: number | null = null;
  private currentGesture: DetectedGesture | null = null;
  private lastPosition: { x: number; y: number } | null = null;

  // Cooldown & hand leave state
  private cooldownEndTime: number = 0;
  private waitingForHandLeaveOrChange: boolean = false;
  private lastCompletedGesture: DetectedGesture | null = null;

  // Active phrase reveal animation state
  private activePhrase: DemoPhrase | null = null;
  private revealedWordIndex: number = -1;
  private isRevealing: boolean = false;
  private revealTimer: number | null = null;

  // Callbacks for live UI updates
  private callbacks: DemoRecognizerCallbacks = {};
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(callbacks?: DemoRecognizerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
    this.setupPresenterShortcuts();
  }

  public setCallbacks(callbacks: DemoRecognizerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Hidden presenter shortcuts: Keys '1' to '9' trigger phrase 1 to 9 directly.
   */
  private setupPresenterShortcuts(): void {
    if (typeof window === 'undefined') return;

    this.keydownHandler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < DEMO_PHRASES.length) {
          this.triggerPhraseByIndex(index);
        }
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Manually trigger a specific phrase (used by presenter shortcuts or simulator).
   */
  public triggerPhraseByIndex(index: number): void {
    const phrase = DEMO_PHRASES[index];
    if (!phrase) return;

    // Interrupt any cooldown
    this.cooldownEndTime = 0;
    this.waitingForHandLeaveOrChange = false;
    this.startPhraseReveal(phrase);
  }

  private stopRevealTimer(): void {
    if (this.revealTimer !== null) {
      clearInterval(this.revealTimer);
      this.revealTimer = null;
    }
  }

  /**
   * Initiates the 250ms per word progressive typing reveal.
   */
  private startPhraseReveal(phrase: DemoPhrase): void {
    this.stopRevealTimer();
    this.activePhrase = phrase;
    this.isRevealing = true;
    this.revealedWordIndex = 0;
    this.steadyStartTime = null;

    // Reveal first word immediately
    const firstWord = phrase.words[0] || '';
    this.callbacks.onWordRevealed?.(firstWord, firstWord, phrase);

    if (phrase.words.length <= 1) {
      this.isRevealing = false;
      this.cooldownEndTime = performance.now() + 2000;
      this.waitingForHandLeaveOrChange = true;
      this.lastCompletedGesture = this.currentGesture;
      this.callbacks.onPhraseCompleted?.(phrase, phrase.text);
      this.callbacks.onProgressUpdated?.(0);
      return;
    }

    // Advance word by word every 250ms
    this.revealTimer = window.setInterval(() => {
      this.revealedWordIndex++;
      const currentWords = phrase.words.slice(0, this.revealedWordIndex + 1);
      const currentText = currentWords.join(' ');
      const currentWord = phrase.words[this.revealedWordIndex] || '';

      this.callbacks.onWordRevealed?.(currentWord, currentText, phrase);

      if (this.revealedWordIndex >= phrase.words.length - 1) {
        this.stopRevealTimer();
        this.isRevealing = false;
        this.cooldownEndTime = performance.now() + 2000; // 2s cooldown
        this.waitingForHandLeaveOrChange = true;
        this.lastCompletedGesture = this.currentGesture;

        this.callbacks.onPhraseCompleted?.(phrase, phrase.text);
        this.callbacks.onProgressUpdated?.(0);
      }
    }, 250);
  }

  /**
   * Detect current hand gesture shape from 21 MediaPipe landmarks.
   */
  public detectGestureShape(landmarks: Landmark[]): DetectedGesture {
    if (!landmarks || landmarks.length < 21) {
      return 'steady';
    }

    // In screen coordinates, lower y is higher up in space
    const indexExt = landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
    const middleExt = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y;
    const ringExt = landmarks[RING_TIP].y < landmarks[RING_PIP].y;
    const pinkyExt = landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;

    const thumbUp = landmarks[THUMB_TIP].y < landmarks[THUMB_MCP].y - 0.04;
    const palmScale = dist(landmarks[WRIST], landmarks[MIDDLE_MCP]) || 0.2;
    const thumbIndexDist = dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
    const isOkSign = (thumbIndexDist / palmScale) < 0.35;

    // 1. OK sign -> THANK_YOU
    if (isOkSign && middleExt && ringExt && pinkyExt) {
      return 'ok_sign';
    }

    // 2. Thumbs up -> YES
    if (thumbUp && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      return 'thumbs_up';
    }

    // 3. Fist -> NO
    if (!thumbUp && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      return 'fist';
    }

    // 4. Pointing -> HELP
    if (indexExt && !middleExt && !ringExt && !pinkyExt) {
      return 'pointing';
    }

    // 5. Open Palm -> HELLO
    if (indexExt && middleExt && ringExt && pinkyExt) {
      return 'open_palm';
    }

    return 'steady';
  }

  /**
   * Main recognize loop method called every video frame.
   */
  public recognize(landmarks: Landmark[]): RecognitionResult | null {
    const now = performance.now();

    // 1. If currently revealing a phrase word by word, return the current active gloss
    if (this.isRevealing && this.activePhrase) {
      const activeGloss =
        this.activePhrase.glossSequence[
          Math.min(this.revealedWordIndex, this.activePhrase.glossSequence.length - 1)
        ] || this.activePhrase.glossSequence[0];

      return {
        gloss: activeGloss,
        confidence: this.activePhrase.confidence,
        landmarksDetected: landmarks?.length || 21,
      };
    }

    // 2. When no hand is detected, return null and reset tracking
    if (!landmarks || landmarks.length < 21) {
      this.steadyStartTime = null;
      this.currentGesture = null;
      this.lastPosition = null;
      this.waitingForHandLeaveOrChange = false;
      this.callbacks.onProgressUpdated?.(0);
      return null;
    }

    // 3. Check 2-second cooldown
    if (now < this.cooldownEndTime) {
      this.steadyStartTime = null;
      this.callbacks.onProgressUpdated?.(0);
      return null;
    }

    const currentGesture = this.detectGestureShape(landmarks);
    const wristPos = { x: landmarks[WRIST].x, y: landmarks[WRIST].y };

    // 4. If waiting for hand to leave or change gesture after last phrase
    if (this.waitingForHandLeaveOrChange) {
      if (currentGesture !== this.lastCompletedGesture && currentGesture !== 'steady') {
        // Changed gesture, unlock immediately
        this.waitingForHandLeaveOrChange = false;
      } else {
        return null;
      }
    }

    // 5. Check if hand is held steady
    let isMoving = false;
    if (this.lastPosition) {
      const movement = Math.sqrt(
        Math.pow(wristPos.x - this.lastPosition.x, 2) + Math.pow(wristPos.y - this.lastPosition.y, 2)
      );
      // If movement exceeds jitter threshold (0.04 in normalized coords)
      if (movement > 0.04) {
        isMoving = true;
      }
    }
    this.lastPosition = wristPos;

    // Reset timer if gesture changed significantly or hand moved excessively
    if (isMoving || this.currentGesture !== currentGesture) {
      this.steadyStartTime = now;
      this.currentGesture = currentGesture;
      this.callbacks.onProgressUpdated?.(0);
      return null;
    }

    if (!this.steadyStartTime) {
      this.steadyStartTime = now;
    }

    // Elapsed steady time
    const elapsed = now - this.steadyStartTime;
    const progress = Math.min(1.0, elapsed / 1200); // 1.2 second hold
    this.callbacks.onProgressUpdated?.(progress);

    // Friendly display gloss during hold
    const previewGloss =
      currentGesture === 'open_palm'
        ? 'HELLO'
        : currentGesture === 'thumbs_up'
        ? 'YES'
        : currentGesture === 'fist'
        ? 'NO'
        : currentGesture === 'pointing'
        ? 'HELP'
        : currentGesture === 'ok_sign'
        ? 'THANK_YOU'
        : 'STEADY_SIGN';

    // 6. When held steady for ~1.2 seconds, start word-by-word reveal!
    if (elapsed >= 1200) {
      this.selectAndStartPhrase(currentGesture);
    }

    return {
      gloss: previewGloss,
      confidence: 0.88,
      landmarksDetected: landmarks.length,
    };
  }

  /**
   * Selects the phrase based on detected gesture or cycles to the next one.
   */
  private selectAndStartPhrase(gesture: DetectedGesture): void {
    let selectedPhrase: DemoPhrase;

    if (gesture in GESTURE_TO_PHRASE_INDEX) {
      const idx = GESTURE_TO_PHRASE_INDEX[gesture];
      selectedPhrase = DEMO_PHRASES[idx] || DEMO_PHRASES[0];
    } else {
      // Cycle through phrases
      selectedPhrase = DEMO_PHRASES[this.cycleIndex % DEMO_PHRASES.length];
      this.cycleIndex = (this.cycleIndex + 1) % DEMO_PHRASES.length;
    }

    this.startPhraseReveal(selectedPhrase);
  }

  public getHoldProgress(): number {
    if (!this.steadyStartTime) return 0;
    const elapsed = performance.now() - this.steadyStartTime;
    return Math.min(1.0, Math.max(0, elapsed / 1200));
  }

  public reset(): void {
    this.stopRevealTimer();
    this.steadyStartTime = null;
    this.currentGesture = null;
    this.lastPosition = null;
    this.isRevealing = false;
    this.activePhrase = null;
    this.revealedWordIndex = -1;
    this.cooldownEndTime = 0;
    this.waitingForHandLeaveOrChange = false;
    this.callbacks.onProgressUpdated?.(0);
  }

  public isCurrentlyRevealing(): boolean {
    return this.isRevealing;
  }

  public destroy(): void {
    this.reset();
    if (this.keydownHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }
}
