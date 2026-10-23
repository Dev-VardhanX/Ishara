# Model contract (Member A provides, Members B and C consume)

## Sign recognition models
- Files: `isl_model.onnx`, `asl_model.onnx`, `labels_isl.json`, `labels_asl.json`
- Input tensor: `[1, 64, 225]` float32 = 64 frames x 75 landmarks x 3 coordinates (x, y, z)
- Landmark order: pose 33, left hand 21, right hand 21 (MediaPipe)
- Normalisation: subtract the shoulder midpoint, divide by shoulder width; missing hand = zeros
  (reference code: `ml/src/preprocess.py`; Kotlin and TypeScript must match it exactly)
- Output: logits over the vocabulary; `labels_*.json` maps index -> gloss id

## Emotion
Labels: `neutral`, `happy`, `sad`, `angry`, `surprised`.

| Emotion | TTS pitch | TTS rate | Volume |
|---|---|---|---|
| neutral | 1.0 | 1.0 | 1.0 |
| happy | 1.2 | 1.1 | 1.0 |
| sad | 0.8 | 0.85 | 0.8 |
| angry | 1.0 | 1.15 | 1.0 |
| surprised | 1.3 | 1.1 | 1.0 |

(Starting values; tune together.)

## Glosses and animations
- Gloss ids are uppercase: `HELLO`, `THANK_YOU` (from `ml/vocab/vocab_v1.csv`).
- Avatar clips: `ISL_<GLOSS>.glb` / `ASL_<GLOSS>.glb`, listed in `assets/avatar/manifest.json`.
- Every clip starts and ends in the same neutral rest pose.
