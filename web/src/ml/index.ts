// src/ml/index.ts — Central Machine Learning & Recognizer Provider
// Configures and exports the active recognizer for the Ishara application.
// To switch to a trained model or ONNX classifier in the future, simply update
// the `createActiveRecognizer()` factory or `ACTIVE_RECOGNIZER_TYPE`.

import { Recognizer, RuleBasedRecognizer, OnnxRecognizer } from '../lib/recognizer';
import { DemoRecognizer, DemoRecognizerCallbacks } from './demoRecognizer';

export type RecognizerType = 'demo' | 'rule_based' | 'onnx';

// Currently active recognizer type for the application
export const ACTIVE_RECOGNIZER_TYPE: RecognizerType = 'demo';

/**
 * Factory function creating the configured recognizer.
 * Put the recognizer choice in this one place so a real model can easily replace it later.
 */
export function createActiveRecognizer(callbacks?: DemoRecognizerCallbacks): Recognizer {
  switch (ACTIVE_RECOGNIZER_TYPE) {
    case 'demo':
      return new DemoRecognizer(callbacks);
    case 'rule_based':
      return new RuleBasedRecognizer();
    case 'onnx':
      return new OnnxRecognizer();
    default:
      return new DemoRecognizer(callbacks);
  }
}

export * from './demoRecognizer';
export * from './demoPhrases';
export * from './handTracker';
