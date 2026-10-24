// src/ml/index.ts — Central Machine Learning & Recognizer Provider
// Configures and exports the active recognizer for the Ishara application.

import { Recognizer, RuleBasedRecognizer, OnnxRecognizer } from '../lib/recognizer';
import { DemoRecognizer, DemoRecognizerCallbacks } from './demoRecognizer';
import { ISLRecognizer, ISLRecognizerCallbacks } from './islClassifier';

export type RecognizerType = 'isl_realtime' | 'demo' | 'rule_based' | 'onnx';

// Active recognizer type: ISL Realtime Recognizer supporting 20 common ISL signs
export const ACTIVE_RECOGNIZER_TYPE: RecognizerType = 'isl_realtime';

/**
 * Factory function creating the configured recognizer.
 */
export function createActiveRecognizer(
  callbacks?: ISLRecognizerCallbacks | DemoRecognizerCallbacks
): Recognizer {
  switch (ACTIVE_RECOGNIZER_TYPE) {
    case 'isl_realtime':
      return new ISLRecognizer(callbacks as ISLRecognizerCallbacks);
    case 'demo':
      return new DemoRecognizer(callbacks as DemoRecognizerCallbacks);
    case 'rule_based':
      return new RuleBasedRecognizer();
    case 'onnx':
      return new OnnxRecognizer();
    default:
      return new ISLRecognizer(callbacks as ISLRecognizerCallbacks);
  }
}

export * from './islClassifier';
export * from './demoRecognizer';
export * from './demoPhrases';
export * from './handTracker';
