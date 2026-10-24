// src/lib/recognizer.ts — Sign Language Landmark Recognition System
// Implements Recognizer interface, RuleBasedRecognizer with geometric heuristics,
// 8-frame smoothing filter, and OnnxRecognizer stub.

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface RecognitionResult {
  gloss: string;
  confidence: number;
  landmarksDetected?: number;
}

export interface Recognizer {
  name: string;
  recognize(landmarks: Landmark[]): RecognitionResult | null;
}

// MediaPipe Hand Landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_DIP = 11;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_DIP = 15;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

// Utility: euclidean distance between two landmarks
const distance = (a: Landmark, b: Landmark): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

/**
 * RuleBasedRecognizer
 * Classifies geometric hand shapes into standard uppercase gloss IDs:
 * - Open palm = HELLO
 * - Thumbs up = YES
 * - Fist = NO
 * - Pointing index = YOU
 * - OK sign = OK
 */
export class RuleBasedRecognizer implements Recognizer {
  name = 'Geometric Rule-Based Recognizer (v1)';

  recognize(landmarks: Landmark[]): RecognitionResult | null {
    if (!landmarks || landmarks.length < 21) {
      return null;
    }

    const wrist = landmarks[WRIST];

    // Determine if fingers are extended (tip further from wrist than PIP/MCP)
    // Note: In screen coords, lower Y is higher up in space
    const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
    const middleExtended = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y;
    const ringExtended = landmarks[RING_TIP].y < landmarks[RING_PIP].y;
    const pinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;

    // Check distance between thumb tip and index tip for OK sign
    const thumbIndexDist = distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
    const palmScale = distance(landmarks[WRIST], landmarks[MIDDLE_MCP]) || 0.2;
    const isThumbIndexTouching = thumbIndexDist / palmScale < 0.35;

    // Thumb pointing up check: thumb tip significantly higher than thumb MCP
    const thumbPointingUp = landmarks[THUMB_TIP].y < landmarks[THUMB_MCP].y - 0.05;

    // Thumb pointing down check
    const thumbPointingDown = landmarks[THUMB_TIP].y > landmarks[THUMB_MCP].y + 0.05;

    // 1. Thumbs Up = GOOD: thumb up, all 4 other fingers curled
    if (thumbPointingUp && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return {
        gloss: 'GOOD',
        confidence: 0.96,
        landmarksDetected: landmarks.length,
      };
    }

    // 2. Thumbs Down = BAD
    if (thumbPointingDown && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return {
        gloss: 'BAD',
        confidence: 0.95,
        landmarksDetected: landmarks.length,
      };
    }

    // 3. Fist = NO: all 4 fingers curled, thumb folded across fingers
    if (!thumbPointingUp && !thumbPointingDown && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return {
        gloss: 'NO',
        confidence: 0.92,
        landmarksDetected: landmarks.length,
      };
    }

    // 4. ILY Sign = LOVE: thumb, index, pinky extended while middle and ring are curled
    if (indexExtended && pinkyExtended && !middleExtended && !ringExtended) {
      return {
        gloss: 'LOVE',
        confidence: 0.95,
        landmarksDetected: landmarks.length,
      };
    }

    // 5. Open Palm = HELLO: all 4 fingers extended and thumb open
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return {
        gloss: 'HELLO',
        confidence: 0.93,
        landmarksDetected: landmarks.length,
      };
    }

    return null;
  }
}

/**
 * RecognitionSmoother
 * Requires a candidate sign to hold continuously for `requiredFrames` (default 8)
 * before emitting it as an accepted label, preventing noisy flickering.
 */
export class RecognitionSmoother {
  private lastCandidate: string | null = null;
  private candidateCount: number = 0;
  private acceptedGloss: string | null = null;
  private readonly requiredFrames: number;

  constructor(requiredFrames: number = 8) {
    this.requiredFrames = requiredFrames;
  }

  process(rawResult: RecognitionResult | null): RecognitionResult | null {
    if (!rawResult) {
      if (this.candidateCount > 0) {
        this.candidateCount--;
      } else {
        this.lastCandidate = null;
      }
      return null;
    }

    if (rawResult.gloss === this.lastCandidate) {
      this.candidateCount++;
    } else {
      this.lastCandidate = rawResult.gloss;
      this.candidateCount = 1;
    }

    // Must hold for specified threshold
    if (this.candidateCount >= this.requiredFrames) {
      this.acceptedGloss = this.lastCandidate;
      return {
        gloss: this.acceptedGloss,
        confidence: rawResult.confidence,
        landmarksDetected: rawResult.landmarksDetected,
      };
    }

    return null;
  }

  getCurrentHoldProgress(): number {
    return Math.min(1.0, this.candidateCount / this.requiredFrames);
  }

  getCandidate(): string | null {
    return this.lastCandidate;
  }

  reset(): void {
    this.lastCandidate = null;
    this.candidateCount = 0;
    this.acceptedGloss = null;
  }
}

/**
 * OnnxRecognizer
 * Stub for running trained ONNX transformer/LSTM models with onnxruntime-web.
 */
export class OnnxRecognizer implements Recognizer {
  name = 'ONNX Neural Vision Classifier (Stub)';

  recognize(_landmarks: Landmark[]): RecognitionResult | null {
    // TODO: Load isl_model.onnx and asl_model.onnx with onnxruntime-web
    // Contract requirements (docs/contracts/model-contract.md):
    // 1. Input tensor shape: [1, 64, 225] float32 = 64 frames x 75 landmarks x 3 coordinates
    // 2. Normalization: subtract shoulder midpoint, divide by shoulder width
    // 3. Landmark sequence: pose 33, left hand 21, right hand 21
    // 4. Argmax logits over labels_isl.json / labels_asl.json
    return null;
  }
}

// Hand Landmark connection lines for visual canvas drawing
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];
