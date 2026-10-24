# AGENTS.md — Project Rules for "Ishara"

Ishara is a two-way sign language translator (Indian Sign Language [ISL] + American Sign Language [ASL]) with a 3D cartoon avatar and web portal, developed under a strict 12-hour hackathon timeline.

All AI agents, pair programmers, and contributors working on this codebase must adhere strictly to these rules.

---

## 1. Hackathon Mindset: Speed Over Perfection

- **Zero Unit Tests**: Do not write unit, integration, or E2E tests. Verify functionality interactively.
- **Mock Data First**: Every view and flow must work immediately using rich, realistic mock data.
- **Conditional Backend**: Connect to the real Supabase backend **only if** the required environment variables are present and configured; otherwise, seamlessly fall back to mock data without crashing.
- **Strict Scope Boundaries**: Build only the target screens and frozen features. Do not add speculative features, over-engineered abstractions, or unnecessary dependencies.
- **Match Designs First**: Always inspect the corresponding reference screenshots in `docs/design/` before creating or modifying any screen.

---

## 2. Technology Stack

- **Framework & Runtime**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS + Claymorphism design tokens (`design/tokens.css`)
- **Routing**: React Router (`react-router-dom`)
- **State Management**: Zustand
- **3D Graphics & Avatar**: Three.js, `@pixiv/three-vrm`
- **Machine Learning & Vision**: MediaPipe Tasks Web (`@mediapipe/tasks-vision`), ONNX Runtime Web
- **Backend / Authentication**: `@supabase/supabase-js` (client-side only)

---

## 3. Design System & Claymorphism Guidelines

Every screen must reflect a tactile, soft 3D clay aesthetic ("claymorphism"):

### Palette & Contrast
- **Pastel Palette**:
  - Blue (`#7C9CFF` / `#8EA7E9`)
  - Coral (`#FFB59E` / `#FF8A8A`)
  - Green (`#A8E6A1` / `#A0D995`)
  - Purple (`#D4A5FF` / `#B39DDB`)
  - Base Clay Background: `#E9EEF7`
  - Text & Elements: Deep contrast slate `#2B2D42`
- **Accessibility**:
  - Text contrast must be **>= 4.5:1** against backgrounds (WCAG AA).
  - Visible keyboard focus rings are mandatory on interactive elements (`focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400`).

### Geometry & Elevation
- **Corner Radius**: Standard `28px` border radius (`rounded-[28px]`, `var(--clay-radius)`).
- **Shadow Placement Rule**: **Use shadows ONLY on cards and buttons.** Never apply clay shadows to plain text, icons, list rows, or every arbitrary wrapper.
- **Raised Items (Cards, Buttons)**: Two soft outer shadows (top-left highlight + bottom-right shadow):
  ```css
  box-shadow: 8px 8px 16px rgba(150, 165, 195, 0.55), -8px -8px 16px rgba(255, 255, 255, 0.9);
  ```
- **Pressed & Input States (Inputs, Active Buttons)**: Inset dual shadows:
  ```css
  box-shadow: inset 4px 4px 8px rgba(150, 165, 195, 0.55), inset -4px -4px 8px rgba(255, 255, 255, 0.9);
  ```
- **Typography**: Nunito (`font-family: 'Nunito', system-ui, sans-serif`).

---

## 4. Domain & Data Contracts

- **Gloss Identifiers**: Gloss IDs must ALWAYS be **UPPERCASE with underscores** (e.g., `HELLO`, `THANK_YOU`, `GOOD_MORNING`, `HOW_ARE_YOU`).
- **Animation Clips**: Avatar clips correspond to `<LANG>_<GLOSS>.glb` (e.g., `ISL_HELLO.glb`, `ASL_THANK_YOU.glb`) listed in `assets/avatar/manifest.json`.
- **Rest Poses**: Every 3D animation clip starts and ends in the same neutral rest pose for smooth chaining.
- **Two-Way Modalities**:
  - **Sign -> Text/Voice**: Camera capture -> MediaPipe landmarks -> Model classification -> Emotional TTS output.
  - **Voice/Text -> Sign**: Speech/Text -> Gloss parsing -> 3D cartoon avatar playback sequence.
  - **Supported Sign Languages**: ISL (Indian Sign Language) and ASL (American Sign Language).

---

## 5. Security & Environment Configuration

- **Client-Side Key Restrictions**: ONLY the Supabase `anon` public key may be used in the client application.
- **Never Commit Secrets**: Never commit `.env` or sensitive credentials. Keep `.env` in `.gitignore`.
- **Environment Variable Format**: All client-exposed keys must be prefixed with `VITE_`:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```
- **Template Requirement**: Maintain an up-to-date `.env.example` in both the project root and `web/`.

---

## 6. Truth in Advertising

- **No False Claims**: Never claim features or certifications not implemented in the codebase.
- **Prohibited Statements**: No claims of GDPR compliance, HIPAA compliance, 256-bit military-grade encryption, 100% medical accuracy, or production certifications.
- Be accurate about hackathon capabilities: real-time in-browser inference with MediaPipe/ONNX and client-side 3D VRM/glTF rendering.

---

## 7. Mandatory Agent Reporting Protocol

After completing **each** task, provide an update formatted in **exactly 3 lines**:
1. **Line 1 (What changed)**: Summary of files, components, or logic modified.
2. **Line 2 (How to run it)**: Exact commands to launch, preview, or test the changes.
3. **Line 3 (Status & Next)**: Brief confirmation of working state and the immediate next step.
