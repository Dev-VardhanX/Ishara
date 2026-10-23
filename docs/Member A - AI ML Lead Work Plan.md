# Member A - AI / ML Lead: Work Plan

Project: Ishara - Sign Language Translator (ISL + ASL) | Owner: Member A | Version 1.0

## 1. Your role in one line

You build every model in the project: sign recognition for ISL and ASL, text-to-gloss, and emotion detection. You deliver models in ONNX format that Member B runs in the Android app and Member C runs in the web portal.

## 2. What you own

| Area | Deliverable |
| --- | --- |
| Datasets | Cleaned ISL and ASL keypoint datasets, plus our own recorded data |
| Sign recognition | isl\_model.onnx and asl\_model.onnx with labels\_isl.json and labels\_asl.json |
| Text to gloss | gloss\_model.onnx (or rule-based fallback) for voice-to-sign |
| Emotion | Emotion classifier and the emotion-to-TTS preset table |
| Model docs | Model card per model: vocabulary, accuracy, latency, input and output format |
| Support | Help B and C integrate and debug the models |

Features you directly power: F1 (sign to voice), F2 (voice to sign, gloss part), F3 (ISL and ASL), F8 (practice feedback in Learn mode).

## 3. Your tech stack

- Python, PyTorch, NumPy, pandas
- MediaPipe Tasks (Pose, Hand and Face Landmarker) for keypoint extraction
- Google Colab / Kaggle notebooks for training (free GPU)
- ONNX and ONNX Runtime for export and testing
- Weights & Biases or TensorBoard for tracking runs (optional)
- GitHub repo folder: /ml
- Datasets: INCLUDE and ISL-CSLRT (ISL), WLASL (ASL), plus own recordings

## 4. The contract you must keep (shared with B and C)

- Input tensor: \[1, 64, 225\] float32. 64 frames x 75 landmarks (33 pose, 21 left hand, 21 right hand) x 3 coordinates.
- Normalisation: subtract the shoulder midpoint, divide by shoulder width. Missing hands are filled with zeros. This preprocessing code must be written once and shared as a short spec so Android (Kotlin) and web (TypeScript) match your Python exactly.
- Output: logits over the vocabulary. The labels file gives the gloss id for each index.
- Emotion labels: neutral, happy, sad, angry, surprised.
- Do not change these without telling B and C.

## 5. Phases, step by step

### Phase 0 - Setup and contracts (Week 1)

1. Create the /ml folder in the shared GitHub repo with a README.
2. Agree the v1 vocabulary with the team: 150 to 300 common signs per language (greetings, family, food, time, places, questions, emergency words). Save it as vocab\_v1.csv.
3. Write the model input and output contract (section 4) and share it with B and C.
4. Download the ISL and ASL datasets and check licences.
5. Set up Colab notebooks and a keypoint extraction script with MediaPipe.

Done when: vocabulary list and contract are signed off by all three members.

### Phase 1 - Data and baseline (Weeks 2 to 4)

1. Extract keypoints from all dataset videos and save them as .npy files with labels.
2. Filter the datasets to the v1 vocabulary. Count samples per sign.
3. Plan our own recording sessions for signs with few samples. Record with a consistent camera setup, several people, different lighting and backgrounds.
4. Build augmentation: small rotations, scaling, time-warp, hand dropout, noise.
5. Train a simple baseline (small LSTM or MLP) on ISL isolated signs to get a first accuracy number.
6. Write the preprocessing spec and the first version of the labels file.
7. Give B a dummy ONNX model with the correct input and output shape, so app work can start before real training finishes.

Done when: baseline accuracy is measured, the dummy model is delivered, and the preprocessing spec is shared.

### Phase 2 - Core ISL model (Weeks 5 to 7)

1. Build the transformer encoder: input projection, positional encoding, 4 to 6 encoder layers, classification head.
2. Train on ISL with the train, validation and test split. Keep different signers in the test set.
3. Tune hyperparameters; target at least 85 percent top-1 on the test set.
4. Export to ONNX, then quantise to INT8. Compare accuracy before and after.
5. Benchmark latency with ONNX Runtime on a laptop and, with B, on a real phone. Target under 100 ms per inference.
6. Deliver isl\_model.onnx, labels\_isl.json and the model card to B.
7. Start collecting and preparing ASL data in parallel.

Done when: isl\_model.onnx runs inside the Android app and recognises signs from the live camera.

### Phase 3 - Gloss, emotion and web (Weeks 8 to 10)

1. Build the text-to-gloss component:
   - First, a rule-based mapper: lowercase, remove filler words, match words and short phrases to the vocabulary, simple word reordering rules.
   - Then, if time allows, a small seq2seq (T5-small) model trained on pairs written with help from a sign language expert or fluent signer.
2. Build the emotion detector: use MediaPipe face blendshapes plus movement speed and hand intensity to output one of the five emotion labels. Start rule-based, then train a small classifier if data allows.
3. Define the emotion-to-TTS preset table (pitch, rate, volume per emotion) with B.
4. Export the gloss model and emotion model to ONNX and deliver to B and C.
5. Help C run isl\_model.onnx in ONNX Runtime Web. If it is too slow in the browser, produce a lighter web version.
6. Fix recognition problems that B and C report from integration.

Done when: voice-to-sign gloss output works for the full vocabulary and emotion labels drive the voice in the app.

### Phase 4 - ASL and polish (Weeks 11 to 12)

1. Train the ASL transformer using the same pipeline (WLASL filtered to the v1 vocabulary).
2. Export, quantise and benchmark asl\_model.onnx. Deliver it with labels\_asl.json.
3. Add confusion matrix analysis: find the most confused signs and add more data or augmentation for them.
4. Add a confidence threshold and smoothing so the app does not output flickering words.
5. Support Learn mode: provide a function that compares the learner's keypoints with the reference sign and returns a similarity score.
6. Re-run quantisation and latency tests on the final models.

Done when: ISL and ASL both reach the target accuracy and run in the app and web portal.

### Phase 5 - Testing and handover (Weeks 13 to 14)

1. Run final evaluation: accuracy per sign, per language, latency on phone, and tests under different lighting and with different people.
2. Fix the worst-performing signs, or honestly list them as limitations.
3. Finish all model cards and the ML section of the project report.
4. Freeze model files and tag the release in GitHub.
5. Prepare the ML slides and demo for the final presentation.
6. Support B and C with last-minute integration bugs.

Done when: final models are frozen, documented and used by the final app and web builds.

## 6. Weekly checklist

- Share one demo-able result at every Friday integration session.
- Update the experiment log (what you changed, accuracy before and after).
- Check that Kotlin and TypeScript preprocessing give the same output as Python on the same test clip.

## 7. Dependencies on the other members

| You need from | What | When |
| --- | --- | --- |
| B | Real-phone latency tests and camera clips from the app | Phase 2 onward |
| B | Agreement on emotion-to-TTS presets | Phase 3 |
| C | The gloss list used for avatar animations, so models and animations match | Phase 0 and Phase 1 |
| C | Web inference test results | Phase 3 |

What B and C need from you: dummy model (end of Phase 1), real ISL model (end of Phase 2), gloss and emotion models (Phase 3), ASL model (Phase 4).

## 8. Risks and fallbacks

| Risk | Fallback |
| --- | --- |
| Not enough ISL data | Reduce the vocabulary, record more own data, use heavier augmentation |
| Accuracy below 85 percent | Reduce vocabulary to the most distinct signs; increase data for confusing pairs |
| Model too slow on phones | Smaller model, INT8 quantisation, fewer frames, lower camera FPS |
| Text-to-gloss model has no training data | Keep the rule-based mapper as the final version |
| ASL schedule slips | Release ASL with a smaller vocabulary |

## 9. Definition of done for Member A

- isl\_model.onnx and asl\_model.onnx meet the accuracy and latency targets.
- Gloss and emotion components work and are integrated.
- All model cards and the ML section of the report are written.
- Model files are tagged in GitHub and documented so another person could retrain them.
