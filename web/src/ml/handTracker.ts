// src/ml/handTracker.ts — MediaPipe Hand Landmarker Offline Tracker
// Loads WASM files from /mediapipe/wasm and model from /models/hand_landmarker.task
// Configured with runningMode VIDEO, numHands 2, GPU delegate with CPU fallback,
// and minDetectionConfidence 0.5.

import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type HandLandmarks = Landmark[];

export interface HandTrackerConfig {
  wasmPath?: string;
  modelPath?: string;
  numHands?: number;
  minDetectionConfidence?: number;
}

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle finger
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring finger
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky finger
  [0, 17], // Palm base
];

class HandTrackerService {
  private landmarker: HandLandmarker | null = null;
  private initPromise: Promise<HandLandmarker> | null = null;
  private activeDelegate: 'GPU' | 'CPU' = 'GPU';
  private lastTimestamp: number = -1;

  /**
   * Initialize MediaPipe HandLandmarker from local WASM and task model.
   * Tries GPU delegate first, falling back to CPU if GPU initialization fails.
   */
  public async init(config?: HandTrackerConfig): Promise<HandLandmarker> {
    if (this.landmarker) {
      return this.landmarker;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const wasmPath = config?.wasmPath ?? (baseUrl ? `${baseUrl}/mediapipe/wasm` : '/mediapipe/wasm');
      const modelPath = config?.modelPath ?? (baseUrl ? `${baseUrl}/models/hand_landmarker.task` : '/models/hand_landmarker.task');
      const numHands = config?.numHands ?? 2;
      const minConfidence = config?.minDetectionConfidence ?? 0.5;

      // 1. Resolve WASM assets locally from public/mediapipe/wasm
      const vision = await FilesetResolver.forVisionTasks(wasmPath);

      // 2. Try GPU delegate first, fallback to CPU
      try {
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: minConfidence,
          minHandPresenceConfidence: minConfidence,
          minTrackingConfidence: minConfidence,
        });
        this.activeDelegate = 'GPU';
      } catch (gpuError) {
        console.warn('HandLandmarker GPU delegate failed; falling back to CPU delegate:', gpuError);
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: minConfidence,
          minHandPresenceConfidence: minConfidence,
          minTrackingConfidence: minConfidence,
        });
        this.activeDelegate = 'CPU';
      }

      this.lastTimestamp = -1;
      return this.landmarker;
    })();

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Detect landmarks for up to two hands from a video element at a specific timestamp.
   * Ensures monotonically increasing timestamps to prevent MediaPipe pipeline assertion errors.
   * Returns an array of hands (each an array of 21 landmarks), or an empty array.
   */
  public detect(videoEl: HTMLVideoElement, timestamp?: number): Landmark[][] {
    if (!this.landmarker || !videoEl || videoEl.readyState < 2) {
      const empty: Landmark[][] = [];
      (empty as any).landmarks = empty;
      return empty;
    }

    // MediaPipe VIDEO mode requires strictly monotonically increasing timestamps
    let frameTimestamp = timestamp ?? performance.now();
    if (frameTimestamp <= this.lastTimestamp) {
      frameTimestamp = this.lastTimestamp + 1;
    }
    this.lastTimestamp = frameTimestamp;

    try {
      const result: HandLandmarkerResult = this.landmarker.detectForVideo(videoEl, frameTimestamp);
      if (result && result.landmarks && result.landmarks.length > 0) {
        // Return up to two hands
        const hands = result.landmarks.slice(0, 2) as Landmark[][];
        // Support both array index access hands[0] and result.landmarks[0] for flexibility
        (hands as any).landmarks = hands;
        (hands as any).handedness = result.handedness;
        return hands;
      }
    } catch (detectionErr) {
      // Catch transient frame-sync warnings during resize or camera stop
    }

    const empty: Landmark[][] = [];
    (empty as any).landmarks = empty;
    return empty;
  }

  /**
   * Clean up and release the HandLandmarker resources.
   */
  public close(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (err) {
        console.warn('Error during HandLandmarker close:', err);
      }
      this.landmarker = null;
    }
    this.lastTimestamp = -1;
  }

  public getActiveDelegate(): 'GPU' | 'CPU' | null {
    return this.landmarker ? this.activeDelegate : null;
  }

  public isReady(): boolean {
    return this.landmarker !== null;
  }
}

// Singleton instance
export const handTracker = new HandTrackerService();

// Standalone exposed functions matching the prompt specification
export const init = (config?: HandTrackerConfig) => handTracker.init(config);
export const detect = (videoEl: HTMLVideoElement, timestamp?: number) => handTracker.detect(videoEl, timestamp);
export const close = () => handTracker.close();

export default handTracker;
