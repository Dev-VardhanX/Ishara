# Ishara web portal - Member C

React + TypeScript + Vite + Tailwind. Covers features F1-F8 in the browser.

## Setup
```bash
npm create vite@latest . -- --template react-ts   # first time only
npm install
npm install @supabase/supabase-js three onnxruntime-web @mediapipe/tasks-vision tailwindcss
cp .env.example .env     # fill in the Supabase URL and anon key from Member B
npm run dev
```

## Notes
- Use only the Supabase **anon** key in the browser.
- Use the tokens in `design/` for the claymorphism style (`design/tokens.css`).
- Models: copy from `ml/models/` into `web/public/models/` for local testing.
- Hosting: Vercel or Netlify (free tier).
