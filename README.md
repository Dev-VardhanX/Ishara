# Ishara - Sign Language Translator (ISL + ASL)

**Ishara** (it means sign) is a two-way sign language translation app for Android and the web.
Sign -> text + emotional voice, and voice/text -> sign performed by a 3D cartoon avatar.
Offline-first, multi-language, with accounts, synced history and a learn mode.
Design theme: claymorphism.

## Team and ownership

| Member | Role | Folders they own | GitHub |
|---|---|---|---|
| Member A | AI / ML | `ml/` | @username-a |
| Member B | Android app + backend | `android/`, `backend/` | @username-b |
| Member C | Website + 3D avatar + design | `web/`, `assets/`, `design/` | @username-c |

`docs/` and `docs/contracts/` are shared. Change a contract only after telling the other two.

## Folder map

```
android/    Android Studio project (Kotlin, Compose)          - Member B
backend/    Supabase schema, RLS, auth/storage setup          - Member B
web/        React + TypeScript web portal                     - Member C
assets/     Avatar GLB files, animation manifest, lessons     - Member C
design/     Claymorphism tokens (shared by app and web)       - Member C
ml/         Training code, vocab, exported ONNX models        - Member A
docs/       Master document, member plans, contracts          - shared
```

## Frozen features (F1-F10)
F1 sign -> voice+text (emotional voice) | F2 voice/text -> sign (3D avatar) | F3 ISL + ASL |
F4 multi-language output | F5 local history | F6 offline + downloadable language packs |
F7 sign-up / login | F8 learn mode | F9 web portal | F10 history in database.
No other features will be added.

## Tech stack
Kotlin, Jetpack Compose, CameraX, Room, SceneView, ONNX Runtime, MediaPipe Tasks, ML Kit Translation,
Vosk, Android TTS | PyTorch (training) | Supabase (Auth, Postgres, Storage) | React + TypeScript + Vite,
Tailwind, Three.js, ONNX Runtime Web | Blender -> glTF | Figma.

## Getting started

```bash
git clone <repo-url>
cd ishara
git lfs install          # needed for .onnx and .glb files
git checkout dev
git checkout -b feature/<area>-<short-name>
```

Then read the README inside your own folder. Read `CONTRIBUTING.md` before your first pull request.

## Documents
Export the four project documents into `docs/` (see `docs/README.md`).
