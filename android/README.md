# Ishara Android app - Member B

Create the Android Studio project **inside this folder** (Kotlin, Jetpack Compose, min SDK 26).
App name: **Ishara**. Suggested package name: `com.yourteam.ishara`.

## Package structure
```
ui/        Compose screens and the ClayTheme (claymorphism)
data/      Room database, repositories
ml/        MediaPipe landmarkers, ONNX Runtime inference, frame buffer
audio/     Vosk speech-to-text, TextToSpeech with emotion presets
sync/      WorkManager sync worker (Room <-> Supabase)
di/        Hilt modules
```

## Key libraries
CameraX, MediaPipe Tasks, ONNX Runtime Android, ML Kit Translation, Vosk Android, SceneView,
Room, WorkManager, Hilt, supabase-kt, EncryptedSharedPreferences.

## Config and secrets
Put the Supabase URL and anon key in `local.properties` (git-ignored) and read them via BuildConfig.
Never commit `local.properties`, keystores or `google-services.json`.

## Inputs from the other members
- Models and labels from `ml/models/` (see `docs/contracts/model-contract.md`)
- Avatar clips and manifest from `assets/avatar/`
- Lesson content from `assets/lessons/`
- Design tokens from `design/tokens.json`
