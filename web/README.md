# Ishara Web Application

The primary interactive client application for **Ishara** (Two-Way Sign Language Translator for ISL & ASL).

Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **MediaPipe Tasks Web**, featuring a custom **Claymorphism** design system.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Ishara functions completely offline with rich mock data. To connect to Supabase:
```bash
cp .env.example .env
```
Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (use client-safe anon keys only).

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## 📁 Key Directories & Modules

- `src/pages/`: Main application views (`SignToVoicePage`, `VoiceToSignPage`, `LearnPage`, `HistoryPage`, `DashboardPage`, `SettingsPage`, `DevPosePage`).
- `src/ml/`: Real-time gesture classification (`islClassifier.ts`), sentence builder (`sentenceBuilder.ts`), MediaPipe integration (`handTracker.ts`), and demo fallback (`demoRecognizer.ts`).
- `src/lib/`: Core utilities including text-to-gloss NLP parsing (`textToGloss.ts`), emotional Web Speech synthesis (`speech.ts`), and conditional Supabase client (`supabase.ts`).
- `src/components/`: Reusable claymorphic UI elements (`AvatarStage`, `Header`, `Sidebar`, `BottomTabBar`, `Badge`).
- `public/mediapipe/wasm/`: Bundled offline MediaPipe WebAssembly modules.
- `public/models/`: Bundled hand landmark model (`hand_landmarker.task`).

For comprehensive architecture details, supported gestures, and system specs, refer to the root [README.md](../README.md).
