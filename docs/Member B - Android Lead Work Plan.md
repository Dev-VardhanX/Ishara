# Member B - Android App + Backend Lead: Work Plan

Project: Ishara - Sign Language Translator (ISL + ASL) | Owner: Member B | Version 1.0

## 1. Your role in one line

You own the Android app and the whole backend (Supabase). You build the Android app in Android Studio: every screen, the camera pipeline, on-device model inference, speech in and out, translation, offline language packs, local history, login, and sync with Supabase.

## 2. What you own

| Area | Deliverable |
| --- | --- |
| App shell | Compose UI, navigation, theme, onboarding, accessibility |
| Live sign to voice (F1) | CameraX + MediaPipe + ONNX inference + translation + emotional TTS |
| Voice to sign (F2) | Vosk STT or typed text + gloss + avatar screen |
| Languages (F4, F6) | ML Kit translation, language pack manager, offline behaviour |
| History (F5, F10) | Room database, history screens with text and voice replay, sync worker |
| Accounts (F7) | Login, sign-up, forgot password, Google Sign-In, session handling, delete account |
| Learn mode UI (F8) | Lesson screens, practice screen, quiz screen (content from C, scoring from A) |
| Release | Signed APK/AAB and a short app user guide |

Backend scope (added to you): the Supabase project, database schema, Row Level Security, Auth setup (email and Google), audio Storage bucket, delete-account flow, backups and security checks. Member C connects the web portal to what you set up. Design: you build the claymorphism look in Jetpack Compose (see the design section in section 5).

## 3. Your tech stack

- Kotlin, Jetpack Compose, Material 3, Android Studio
- CameraX for the camera
- MediaPipe Tasks (Pose, Hand, Face Landmarker) on Android
- ONNX Runtime for Android (runs isl\_model.onnx, asl\_model.onnx, gloss and emotion models)
- Google ML Kit on-device Translation
- Vosk Android (offline speech to text)
- Android TextToSpeech with pitch and rate presets per emotion
- SceneView for the 3D avatar (loads GLB files from C)
- Room (local database), DataStore (settings), WorkManager (downloads and sync)
- Supabase Kotlin client (supabase-kt) for Auth, Postgres and Storage
- EncryptedSharedPreferences for the session token
- Hilt for dependency injection, Kotlin Coroutines and Flow
- Min SDK 26 (Android 8.0), GitHub folder: /android

## 4. Contracts you must follow

- Model input: \[1, 64, 225\] float32 (64 frames x 75 landmarks x 3), normalised by shoulder midpoint and width exactly as in A's preprocessing spec.
- Model output: logits plus labels JSON from A.
- Avatar clips: GLB files named ISL\_\<GLOSS>.glb or ASL\_\<GLOSS>.glb with a manifest.json from C.
- Database tables: same as the master document (profiles, conversations, messages, learn\_progress, language\_packs).
- Emotion labels: neutral, happy, sad, angry, surprised.

## 5. Phases, step by step

### Phase 0 - Setup and design (Week 1)

1. Create the Android Studio project (Kotlin, Compose, min SDK 26) inside the shared GitHub repo.
2. Set up the package structure: ui, data, ml, audio, sync, di.
3. Agree the screen list with C and sketch the main screens in Figma: Splash, Auth, Home, Sign to Voice, Voice to Sign, Learn, History, Language Packs, Settings.
4. Agree the database schema with C (Room and Supabase should match).
5. Set up branches and a pull request rule: no direct pushes to main.

**Backend work this phase (added to your scope):**

- Create the Supabase project and invite A and C. Keep the URL and anon key in a private team note, never in public code.
- Write the database schema SQL (profiles, conversations, messages, learn\_progress) to match Room, and agree it with C and A.

Done when: empty app builds and runs, Figma screens exist, schema is agreed.

### Phase 1 - App skeleton and camera (Weeks 2 to 4)

1. Build navigation and the Home screen with six entries.
2. Build the theme: high contrast, large text, dark mode.
3. Implement CameraX preview with permission handling.
4. Integrate MediaPipe landmarkers and draw the keypoints on the preview for testing.
5. Write the frame buffer: collect the last 64 frames of landmarks, normalise them, and produce the \[1, 64, 225\] tensor.
6. Create the Room database with all tables and DAOs, plus unit tests.
7. Load A's dummy ONNX model and run inference on the live buffer to prove the pipeline works.
8. Set up the Supabase client with C: confirm you can connect.

**Backend work this phase (added to your scope):**

- Run the schema in Supabase and turn on Row Level Security: select, insert, update and delete only where user\_id equals the logged-in user.
- Configure Supabase Auth: email and password, Google provider, email templates, password reset.
- Create the Storage bucket for audio with a policy so each user can only read and write their own folder.
- Test with two accounts, then give C the anon key and the API notes so the web login can be built.
- Build the ClayTheme and base clay components in Compose (see the design section).

Done when: live camera feeds keypoints into the dummy model and the result appears on screen.

### Phase 2 - Core ISL sign-to-voice flow (Weeks 5 to 7)

1. Replace the dummy model with isl\_model.onnx and show recognised words on screen.
2. Add smoothing: confidence threshold, require the same word for several frames, and a short cool-down so words do not flicker.
3. Build the sentence builder that joins recognised words into a text line.
4. Integrate Android TTS: speak the text with a neutral voice first.
5. Build the Sign to Voice screen: live preview, live text, speak and stop buttons, language selectors.
6. Save each conversation and message to Room.
7. Measure FPS, latency and memory on a mid-range phone and report numbers to A.
8. Build the first version of the History list.

**Backend work this phase (added to your scope):**

- Keep the schema as SQL migration files in GitHub and update them whenever a table changes.
- Add indexes for history queries (by user and date) and test insert and select from the app.

Done when: an ISL signer can sign words to the camera and the phone shows and speaks them.

### Phase 3 - Voice-to-sign, languages, login, history, emotion (Weeks 8 to 10)

1. Add Vosk STT with a microphone button and a text input option.
2. Connect A's gloss output and C's avatar: pass the gloss list to the avatar player and play the clips in order, with speed control.
3. Integrate ML Kit translation: translate recognised text to the chosen output language, and translate input text before gloss mapping when needed.
4. Build the Language Packs screen: list, size, download with progress (WorkManager), delete, and an offline status label.
5. Build the login flow with Supabase Auth: sign up, login, forgot password, Google Sign-In, secure session storage, logout.
6. Make the app work offline after the first login: restore the session without internet.
7. Build the sync worker: upload new Room rows to Supabase when online, download history on a fresh login, handle retries.
8. Add emotion-to-voice: take A's emotion label and apply the TTS preset (pitch, rate, volume).
9. Build the History detail screen: show text, replay voice, delete a conversation.

**Backend work this phase (added to your scope):**

- Verify sync from app to Supabase and back, and confirm the web portal shows the same history (test with C).
- Build the delete-account flow: remove the user's rows and audio files, then the auth user (a Supabase Edge Function or a safe client sequence).

Done when: full ISL flow works in both directions, in at least English, Hindi and Marathi, and history syncs to Supabase.

### Phase 4 - ASL, Learn mode, polish (Weeks 11 to 12)

1. Add the ASL model, labels and Vosk/translation settings; add the sign language switch (ISL or ASL) in Settings and on the main screens.
2. Build the Learn mode screens with C: lesson list, lesson player with the avatar, practice with camera (use A's similarity score for feedback), quiz screen, progress saved to Room and synced.
3. Build the Profile screen: edit name and preferred language, logout, delete account (deletes Supabase rows and audio, then the auth user).
4. Polish: loading states, error messages, empty states, haptics, accessibility labels, app icon.
5. Reduce app size: bundle only the default models and languages; keep the rest as downloads.

**Backend work this phase (added to your scope):**

- Host the learn content (lesson JSON or a lessons table) so the app and the web portal read the same data.
- Add RLS policies for learn\_progress and check usage against the Supabase free-plan limits.

Done when: all 10 features are present in the app.

### Phase 5 - Testing and release (Weeks 13 to 14)

1. Run the full test plan: unit tests, UI tests, airplane-mode tests, login and sync tests, sign-up and reset tests.
2. Test on at least three devices, including one low-end phone.
3. Optimise battery and memory: lower frame rate when idle, release the camera properly.
4. Fix the bug list from the team and from the usability tests.
5. Build a signed release APK/AAB and tag the release in GitHub.
6. Write the app section of the report and a short user guide with screenshots.
7. Prepare the app demo for the final presentation.

**Backend work this phase (added to your scope):**

- Security checks: log in as user 1 and try to read user 2's data (must fail), check that no secret keys are in the repos, check HTTPS.
- Test delete account end to end: all rows and audio files must be removed.
- Export a database backup and note how to restore it.
- Check the Supabase free-plan limits and confirm the project is awake before the demo.
- Write the backend section of the report and a short admin guide.

Done when: signed release build is ready and demoed without crashes.

### Design theme: claymorphism (app)

- Build a ClayTheme in Compose: colour scheme, Nunito typography and shapes with a 28 dp corner radius.
- Create reusable pieces: a raised modifier (dark bottom-right and light top-left shadow), a pressed modifier (inner shadow), and ClayButton, ClayCard, ClayTextField and ClayToggle composables.
- Use the same colour and shadow tokens as the master document and C's Figma file.
- Watch performance: blurred shadows are costly, so cache shadow drawing or use simple layered shapes in long lists such as History.
- Watch contrast: dark text on pastel buttons, at least 4.5:1, and a high-contrast option in Settings.
- Schedule: theme and components in Phase 1, polish in Phase 4.

## 6. Weekly checklist

- Merge your branch to main only after it builds and runs.
- Bring a working build to every Friday integration session.
- Keep a list of bugs found in A's and C's parts and report them the same day.

## 7. Dependencies on the other members

| You need from | What | When |
| --- | --- | --- |
| A | Preprocessing spec and dummy ONNX model | End of Phase 1 |
| A | isl\_model.onnx and labels | End of Phase 2 |
| A | Gloss and emotion models | Phase 3 |
| A | asl\_model.onnx and similarity function | Phase 4 |
| C | Web portal feedback on schema and API needs (you own Supabase) | Phase 1 |
| C | Avatar GLB, animation clips and manifest | Phase 3 |
| C | Learn lessons content and quiz data | Phase 4 |

What A and C need from you: real-phone benchmark numbers, test clips from the app camera, bug reports with steps to reproduce.

## 8. Risks and fallbacks

| Risk | Fallback |
| --- | --- |
| Inference too slow on mid-range phones | Lower camera FPS, use INT8 model, run inference on a background thread, ask A for a smaller model |
| Emotional TTS sounds flat | Keep the preset approach; Piper TTS only as a stretch goal |
| Avatar rendering is heavy in Compose | Reduce polygon count with C, limit shadows, use one light |
| Supabase session expires offline | Keep local access to saved history; ask the user to log in only when syncing |
| Language pack downloads fail | Resume with WorkManager, show clear retry button |
| Vosk models are large | Offer only small models; make larger ones optional downloads |

## 9. Definition of done for Member B

- All 10 features work in the Android app and the core ones work in airplane mode.
- The app is tested on at least three devices and the test results are recorded.
- A signed release build and a user guide are delivered.
- The code is on GitHub with a README that explains how to build and run it. The Supabase backend (schema, RLS, auth, storage, backups) is secured, tested with two accounts and documented.
