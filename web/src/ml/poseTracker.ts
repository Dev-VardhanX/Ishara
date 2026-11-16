// src/ml/poseTracker.ts — MediaPipe Pose Landmarker Offline Tracker
// Loads WASM files from /mediapipe/wasm and model from /models/pose_landmarker_lite.task (5.51 MB)
// Configured with runningMode VIDEO, numPoses 1, GPU delegate with CPU fallback.

import {
  FilesetResolver,
  PoseLandmarker,
  PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { Landmark } from './handTracker';

export interface PoseTrackerConfig {
  wasmPath?: string;
  modelPath?: string;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface PoseLandmarkResultExtended {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  presence: number[];
  visibility: number[];
}

class PoseTrackerService {
  private landmarker: PoseLandmarker | null = null;
  private initPromise: Promise<PoseLandmarker> | null = null;
  private activeDelegate: 'GPU' | 'CPU' = 'GPU';
  private lastTimestamp: number = -1;

  public async init(config?: PoseTrackerConfig): Promise<PoseLandmarker> {
    if (this.landmarker) return this.landmarker;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const wasmPath = config?.wasmPath ?? (baseUrl ? `${baseUrl}/mediapipe/wasm` : '/mediapipe/wasm');
      const modelPath = config?.modelPath ?? (baseUrl ? `${baseUrl}/models/pose_landmarker_lite.task` : '/models/pose_landmarker_lite.task');

      const vision = await FilesetResolver.forVisionTasks(wasmPath);

      // Try GPU delegate first, fallback to CPU
      try {
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: config?.minDetectionConfidence ?? 0.5,
          minTrackingConfidence: config?.minTrackingConfidence ?? 0.5,
        });
        this.activeDelegate = 'GPU';
      } catch (gpuErr) {
        console.warn('PoseLandmarker GPU initialization failed, falling back to CPU:', gpuErr);
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: config?.minDetectionConfidence ?? 0.5,
          minTrackingConfidence: config?.minTrackingConfidence ?? 0.5,
        });
        this.activeDelegate = 'CPU';
      }

      return this.landmarker;
    })();

    return this.initPromise;
  }

  public detect(videoEl: HTMLVideoElement, timestamp?: number): PoseLandmarkResultExtended | null {
    if (!this.landmarker || !videoEl || videoEl.readyState < 2) {
      return null;
    }

    let frameTimestamp = timestamp ?? performance.now();
    if (frameTimestamp <= this.lastTimestamp) {
      frameTimestamp = this.lastTimestamp + 1;
    }
    this.lastTimestamp = frameTimestamp;

    try {
      const result: PoseLandmarkerResult = this.landmarker.detectForVideo(videoEl, frameTimestamp);
      if (result && result.landmarks && result.landmarks.length > 0) {
        const rawLandmarks = result.landmarks[0] as Landmark[];
        const worldLandmarks = (result.worldLandmarks && result.worldLandmarks[0]) ? result.worldLandmarks[0] as Landmark[] : rawLandmarks;
        const presence = (rawLandmarks as any[]).map((lm) => lm.presence ?? 1.0);
        const visibility = (rawLandmarks as any[]).map((lm) => lm.visibility ?? 1.0);

        return {
          landmarks: rawLandmarks,
          worldLandmarks,
          presence,
          visibility,
        };
      }
    } catch (err) {
      // Catch transient frame-sync warnings
    }

    return null;
  }

  public close(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (err) {
        console.warn('Error closing PoseLandmarker:', err);
      }
      this.landmarker = null;
    }
    this.initPromise = null;
    this.lastTimestamp = -1;
  }

  public isReady(): boolean {
    return this.landmarker !== null;
  }
}

export type PoseLandmark = Landmark;

export const POSE_CONNECTIONS: [number, number][] = [
  // Shoulders and neck
  [11, 12],
  // Left arm
  [11, 13],
  [13, 15],
  // Right arm
  [12, 14],
  [14, 16],
  // Wrists to hands
  [15, 17],
  [15, 19],
  [15, 21],
  [16, 18],
  [16, 20],
  [16, 22],
  // Torso
  [11, 23],
  [12, 24],
  [23, 24],
];

export const poseTracker = new PoseTrackerService();
export default poseTracker;
