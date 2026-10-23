# Ishara: Sign Language Translator (ISL + ASL) - Master Project Document

Team of three | Android app (Android Studio) + Web portal | Version 1.0

**App name: Ishara** (it means sign). Use this name for the Android app, the web portal, the repository and all documents.

## 1. Overview

### 1.1 Problem statement

People who communicate through Indian Sign Language face a structural communication barrier with non-signers. No seamless bidirectional translation exists between the spatio-temporal gestural grammar of sign language and spoken natural language.

### 1.2 Solution summary

A transformer-based pipeline extracts 3D pose and hand keypoints from the camera feed and decodes them into text and then synthesised emotional speech. In the reverse direction, recognised speech or typed text is mapped to sign glosses and performed by an animated 3D cartoon avatar. The pipeline runs in real time and offline, so deaf and hard-of-hearing users can take part in everyday conversations independently.

### 1.3 Objectives

1. Real-time two-way translation for ISL and ASL.
2. Output in several spoken languages (Hindi, English, Marathi and more).
3. Fully offline core features, with language packs downloaded manually.
4. A sign-learning module taught by the 3D cartoon character.
5. Accounts with synced history, and a web portal offering the same features.

### 1.4 Scope rule

The 10 features below are frozen. No additional features will be added. Anything not listed is out of scope.

## 2. Frozen Feature List

| # | Feature | Details |
| --- | --- | --- |
| F1 | Live sign to voice + text | Camera captures signing; app shows text and speaks it with an emotional voice (neutral, happy, sad, angry, surprised). |
| F2 | Voice/text to sign | Speech or typed text is converted to glosses and performed by a 3D cartoon avatar. Speed is adjustable. |
| F3 | Two sign languages | ISL and ASL, selectable by the user. |
| F4 | Multi-language output | Translated text and voice in Hindi, English, Marathi and more, via downloadable language packs. |
| F5 | Local history | Every conversation is saved on the device and can be viewed as text and replayed as voice. |
| F6 | Offline app | All core features work without internet. Extra languages are downloaded manually and can be deleted. |
| F7 | Sign-up and login | Account with email + password and Google Sign-In. All user data and history are stored against the account. |
| F8 | Learn sign language | Lessons, practice and quizzes taught by the 3D cartoon character. |
| F9 | Web portal | Web version covering F1 to F8. |
| F10 | Database history | Conversation history is saved in the cloud database and linked to the account. |

### Out of scope

Other sign languages, iOS app, phone/SMS login, video upload to the cloud, video calling, any new feature.

## 3. Team and Ownership

| Member | Role | Owns |
| --- | --- | --- |
| Member A | AI / ML lead | Datasets, sign recognition model, gloss model, emotion model, model export |
| Member B | Android app + backend lead | Android app, on-device inference integration, STT/TTS, translation, history, sync, and the whole Supabase backend (Auth, database schema, Row Level Security, storage, backups, security) |
| Member C | Website + 3D lead | Web portal (all features), 3D cartoon avatar and sign animations, learn content, claymorphism design system |

Detailed step-by-step plans are in the three separate member files. The 3D avatar and sign animations sit with the website member, because the app and the web portal use the same avatar files.

## 4. Fixed Tech Stack

| Layer | Choice |
| --- | --- |
| Android app | Kotlin, Jetpack Compose, Android Studio, CameraX |
| Keypoint extraction | MediaPipe Tasks (Pose, Hand and Face Landmarker) |
| Training | PyTorch on Google Colab / Kaggle |
| Sign recognition | Small transformer encoder, exported to ONNX |
| Inference runtime | ONNX Runtime (Android and web) |
| Text to gloss | Small seq2seq model (T5-small) with rule-based fallback |
| Translation | Google ML Kit on-device Translation (downloadable language models) |
| Speech to text | Vosk (offline) |
| Text to speech | Android TTS with pitch/speed/volume presets per emotion (stretch goal: Piper TTS) |
| Emotion detection | MediaPipe face blendshapes + movement intensity |
| 3D avatar | Blender, exported as glTF/GLB |
| Avatar rendering | SceneView (Android), Three.js (web) |
| Local storage | Room (SQLite) plus audio files |
| Auth | Supabase Auth (email + password, Google Sign-In) |
| Cloud database | Supabase PostgreSQL with Row Level Security |
| File storage | Supabase Storage (audio) |
| Web portal | React + TypeScript, ONNX Runtime Web, Three.js, supabase-js |
| Tooling | GitHub, Figma, Postman, Notion/Trello for tasks |

Design system: claymorphism for both the Android app and the web portal (see section 10.1). Fonts: Nunito (free, rounded). Design tool: Figma.

### Datasets

- ISL: INCLUDE, ISL-CSLRT, plus our own recorded data.
- ASL: WLASL (and MS-ASL if usable), plus our own recorded data.

## 5. System Architecture

### 5.1 Sign to voice flow (F1)

Camera -> MediaPipe keypoints (75 landmarks per frame) -> transformer (ONNX) -> recognised sign words -> ML Kit translation -> emotional TTS -> speaker, with text shown on screen.

### 5.2 Voice to sign flow (F2)

Microphone -> Vosk STT (or typed text) -> optional translation to the signing base language -> text-to-gloss -> animation clips -> 3D avatar.

### 5.3 History and sync flow (F5, F7, F10)

Every message is written to Room first. When online and logged in, a sync worker uploads new rows to Supabase under the user id. The web portal reads the same rows.

### 5.4 Components

UI layer, camera and keypoint layer, ML inference layer, language-pack manager, local database, sync service, avatar renderer, learn module, web client, Supabase backend.

## 6. Data Contracts Shared by All Members

### 6.1 Model input and output

- Input tensor: \[1, 64, 225\] float32. That is 64 frames, 75 landmarks (33 pose + 21 left hand + 21 right hand) x 3 coordinates (x, y, z), normalised relative to the shoulders.
- Output: logits over the vocabulary, plus a labels file (labels\_isl.json, labels\_asl.json).
- Separate model per sign language: isl\_model.onnx and asl\_model.onnx.

### 6.2 Gloss and animation naming

- Each sign has a gloss id in capitals, for example HELLO, THANK\_YOU.
- Animation clips: ISL\_HELLO.glb / ASL\_HELLO.glb, listed in a manifest.json with gloss id, duration and language.

### 6.3 Emotion labels

neutral, happy, sad, angry, surprised. Mapped to TTS presets (for example happy = higher pitch and faster rate, sad = lower pitch and slower rate, angry = louder).

## 7. Database Design (Supabase and Room)

| Table | Columns |
| --- | --- |
| profiles | id (auth user id, PK), name, preferred\_lang, created\_at |
| conversations | id (PK), user\_id (FK), started\_at, sign\_lang, output\_lang |
| messages | id (PK), conversation\_id (FK), user\_id, direction (sign\_to\_voice or voice\_to\_sign), text, translated\_text, audio\_path, emotion, created\_at |
| learn\_progress | user\_id (FK), lesson\_id, status, score, updated\_at |
| language\_packs (local only) | code (PK), name, version, size, installed\_at |

Row Level Security: a user can read and write only rows where user\_id equals their own authenticated id. Room mirrors profiles, conversations, messages and learn\_progress, plus language\_packs.

## 8. Accounts, Security and Privacy

- Login is required once while online. The session is stored securely on the device (EncryptedSharedPreferences) so the app keeps working offline.
- Passwords are handled by Supabase Auth and never stored by us.
- Video and camera frames are processed on the device only and never uploaded.
- Only text, metadata and optional audio are synced.
- All network traffic uses HTTPS.
- Users can log out and delete their account, which deletes their rows and audio files.
- Collect the minimum data: name, email, preferred language.

## 9. Language Pack Design (F4, F6)

- Bundled with the app: English and Hindi (or the team's chosen two), the ISL and ASL models, Vosk small models for those languages.
- Downloadable: ML Kit translation models and Vosk models for Marathi and other languages.
- A Language Packs screen lists packs with size, install, update and delete actions. Downloads run through WorkManager and show progress.
- The app clearly shows which languages work offline.

## 10. Screens (UI Map)

Splash -> Sign up / Login / Forgot password -> Home with six entries: Sign to Voice, Voice to Sign, Learn, History, Language Packs, Settings/Profile.

- Sign to Voice: camera preview, live text, speak button, language selectors.
- Voice to Sign: mic and text input, avatar view, speed control.
- Learn: lesson list, lesson with avatar demo, practice with camera, quiz.
- History: conversation list, detail view with text and voice replay, delete.
- Language Packs: list with download and delete.
- Settings/Profile: sign language, output language, logout, delete account.

### 10.1 Design theme: claymorphism (app and web)

The Android app and the web portal both use a claymorphism look: soft, rounded, puffy shapes that look like they are made of clay. The 3D cartoon avatar should match, with smooth rounded forms and matte pastel colours.

**Style rules**

- Large corner radius (about 28 px / dp) on cards, buttons and inputs.
- Raised elements get two outer shadows: a soft dark one at the bottom right and a light one at the top left.
- Pressed buttons and input fields get an inner shadow, so they look pushed in.
- Pastel colours on a soft light background, with one stronger accent colour for the main action.
- Rounded, friendly font in large sizes.

**Starting tokens (adjust in Figma, then keep identical in app and web)**

| Token | Starting value |
| --- | --- |
| Background | #E9EEF7 |
| Primary (main action) | #7C9CFF |
| Secondary | #FFB59E |
| Success | #A8E6A1 |
| Text | #2B2D42 |
| Raised shadow, dark | 8px 8px 16px rgba(150,165,195,0.55) |
| Raised shadow, light | -8px -8px 16px rgba(255,255,255,0.9) |
| Pressed (inner) shadow | inset 4px 4px 8px dark, inset -4px -4px 8px light |
| Corner radius | 28 |

**Accessibility check.** Claymorphism often has low contrast, so text must keep at least 4.5:1 contrast against its background. Use dark text on pastel buttons, give key buttons clear labels instead of relying on shadows alone, and offer a high-contrast option in Settings. The Live Sign screen stays simple because the camera preview is the main content.

**Who builds it.** Member C creates the design system in Figma and the web components. Member B builds the same look in Jetpack Compose with custom modifiers. Both use the same tokens.

## 11. Requirements

### 11.1 Functional

- FR1: Show recognised text and speak it within about 1 second of each sign.
- FR2: User chooses signing language (ISL or ASL) and output language.
- FR3: Speech or text becomes glosses and the avatar signs them, with adjustable speed.
- FR4: Each conversation is saved locally with timestamp, languages, text and audio.
- FR5: User can browse, replay, search and delete history.
- FR6: User can sign up, log in, log out, reset a forgotten password, and delete the account.
- FR7: User can download and delete language packs manually.
- FR8: Learn mode offers lessons, camera practice with feedback, and quizzes.
- FR9: The web portal offers the same features as the app.
- FR10: History syncs to Supabase when online and logged in.

### 11.2 Non-functional

- Core features work offline after the first login and pack install.
- Recognition latency under 1 second on a mid-range phone (4 GB RAM).
- Target accuracy of at least 85 percent on the supported vocabulary.
- App size under 150 MB; each language pack under 100 MB.
- Android 8.0 (API 26) and above.
- High-contrast, large-text, accessible UI.

### 11.3 v1 vocabulary scope

Continuous sentence recognition is much harder than isolated signs. Version 1 supports a fixed vocabulary of about 150 to 300 common signs per language (greetings, family, food, time, places, questions, emergency words) and short phrases built from them. This limit is stated openly in the project report.

## 12. Testing Plan

- Unit tests: gloss mapping, Room operations, sync logic, emotion-to-TTS mapping.
- Model tests: held-out test set per language, tested across lighting conditions and skin tones; report top-1 accuracy and latency on device.
- Integration tests: full flows in airplane mode, login then offline use, sync after reconnecting.
- Auth tests: wrong password, expired session, password reset, account deletion.
- Usability tests: at least five sign-language users review avatar clarity and the app flow.
- Performance tests: FPS, battery drain and memory on a low-end phone.

## 13. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Limited ISL data | Low accuracy | Restricted vocabulary, augmentation, record our own data |
| Emotional TTS is heavy offline | Feature not met | Ship Android TTS emotion presets first; Piper as a stretch goal |
| Avatar animation workload | Schedule slip | Reuse hand-shape presets, keep the sign library to the v1 vocabulary |
| Sign grammar differs from word order | Wrong translations | Treat gloss mapping as an approximation and validate with signers |
| Two sign languages double the work | Schedule slip | Finish ISL end to end first, then add ASL using the same pipeline |
| Web inference is slow | Poor web experience | Smaller vocabulary and lighter model on web |
| Supabase free-tier limits | Service pause or limits | Check limits early, keep stored data small, back up the database |
| Privacy of user data | Trust and legal | No video upload, minimum data, delete-account option |

## 14. Master Timeline (14 weeks)

| Phase | Weeks | Goal |
| --- | --- | --- |
| Phase 0 | 1 | Setup, contracts, design |
| Phase 1 | 2 to 4 | Foundations: data, app skeleton, backend, avatar rig |
| Phase 2 | 5 to 7 | Core ISL pipeline working end to end |
| Phase 3 | 8 to 10 | Multi-language, history and sync, web portal, emotion |
| Phase 4 | 11 to 12 | ASL, learn mode, offline packs, polish |
| Phase 5 | 13 to 14 | Testing, optimisation, documentation, final demo |

Weekly routine: a short stand-up twice a week, a joint integration session every Friday, and a demo-able build at the end of every phase.

## 15. Definition of Done

The project is done when:

1. All 10 features work in the Android app and the web portal (web may use a smaller vocabulary).
2. The app works fully in airplane mode after login and pack download.
3. ISL and ASL both recognise the v1 vocabulary at the target accuracy.
4. The avatar performs every sign in the v1 vocabulary.
5. History syncs correctly between app and web for the same account.
6. Tests in the test plan have been run and results recorded.
7. Final report, user guide and demo video are complete.

## 16. Document Set

1. This Master Project Document.
2. Member A work plan (AI / ML).
3. Member B work plan (Android app + backend).
4. Member C work plan (website + 3D avatar).

## 17. Glossary

- ISL: Indian Sign Language. ASL: American Sign Language.
- Gloss: a written label for one sign, such as HELLO.
- Keypoints / landmarks: 3D coordinates of body, hand and face points.
- Transformer: neural network architecture used to read the keypoint sequence.
- ONNX: a portable model format that runs on Android and in browsers.
- RLS: Row Level Security, a database rule limiting each user to their own rows.
