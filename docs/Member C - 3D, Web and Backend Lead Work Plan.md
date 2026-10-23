# Member C - Website and 3D Avatar Lead: Work Plan

Project: Ishara - Sign Language Translator (ISL + ASL) | Owner: Member C | Version 1.0

## 1. Your role in one line

You build everything the user sees as a 3D cartoon character, the learning content, and the web portal, all in a claymorphism style. The backend (Supabase) now belongs to Member B; you connect the web portal to it and make sure the web portal and the Android app show the same data.

## 2. What you own

| Area | Deliverable |
| --- | --- |
| Cartoon avatar | Modelled, rigged character exported as GLB |
| Sign animations (F2, F3) | One animation clip per sign in the v1 vocabulary, for ISL and ASL, plus manifest.json |
| Learn content (F8) | Lessons, quizzes and progress structure for ISL and ASL |
| Web portal (F9) | React app with all features F1 to F8 |
| Web accounts and history (F7, F10) | Web login, sign-up and history pages connected to B's Supabase backend |
| Deployment | Web portal hosted online (Vercel or Netlify) |
| Support | Give B the avatar files; run web inference with A's models |

## 3. Your tech stack

- Blender (modelling, rigging, animation) and glTF/GLB export
- Mixamo or retargeting tools for body motion, hand poses created manually in Blender
- Three.js (with GLTFLoader and AnimationMixer) for the web avatar
- React + TypeScript + Vite, Tailwind CSS
- ONNX Runtime Web and MediaPipe Tasks Web for in-browser recognition
- Web Speech API for browser speech input, and browser speech synthesis for voice output
- Supabase backend (owned by Member B), used from the web only through supabase-js
- supabase-js on the web
- Hosting: Vercel or Netlify (free tier) for the web portal
- GitHub folders: /web and /assets, Figma for web design

## 4. Contracts you must follow

- Gloss ids are uppercase words like HELLO and THANK\_YOU, taken from vocab\_v1.csv agreed with A.
- Clip names: ISL\_\<GLOSS>.glb or ASL\_\<GLOSS>.glb (or one GLB with named animations), described in manifest.json with gloss, language, duration and file.
- Every clip starts and ends in the same neutral rest pose, so clips can be chained smoothly.
- Database schema (owned by Member B) as in the master document (profiles, conversations, messages, learn\_progress) with Row Level Security so users see only their own rows.
- Model input and output as in A's contract (the web app runs the same ONNX models).

## 5. Phases, step by step

### Phase 0 - Setup and design (Week 1)

1. Create the /web and /assets folders in the shared repo.
2. Get the Supabase project URL and anon key from B (kept in a private team note, never in public code) and test a connection from a small React page.
3. Agree the database schema with B, who owns it; you only read it and report mismatches.
4. Design the cartoon character on paper: friendly, large clear hands, simple face, plain clothing so hands stand out. Share the concept with the team.
5. Agree the v1 vocabulary list with A.
6. Create the claymorphism design system in Figma (tokens from the master document) and sketch the web portal pages with it.

Done when: design system is sketched, schema is agreed with B, character concept and vocabulary are approved.

### Phase 1 - Foundations (Weeks 2 to 4)

1. Build the reusable claymorphism React component library: buttons, cards, inputs, toggles and modals with soft inner and outer shadows, rounded shapes and pastel colours.
2. Build the web sign-up, login and forgot-password pages in claymorphism and connect them to B's Supabase Auth.
3. Build the web app shell: navigation, home dashboard and light and dark clay themes.
4. Model the cartoon character in Blender with clean low-poly topology (keep the triangle count low so it runs on phones).
5. Rig the character: body, neck, face, and fully rigged fingers (every finger joint), with simple control rigs.
6. Export a test GLB with a rest pose and one wave animation. Send it to B to test SceneView.
7. Create the React + Vite web project with routing and a Supabase login page.
8. Create a library of reusable hand-shape poses (fist, flat hand, pointing, OK, C-shape and others) so signs can be built quickly.

Done when: B can load the test avatar in the app, login works on web, and web login works against B's backend with two test accounts.

### Phase 2 - Sign animation library v1 and web basics (Weeks 5 to 7)

1. Study each ISL sign in the vocabulary from reliable video references and, where possible, check with a fluent signer.
2. Build ISL animations first, grouped by topic (greetings, family, food, and so on). Aim for about 15 to 20 signs per week.
3. Export clips following the naming rule and add each to manifest.json.
4. Build the web Voice to Sign page: text input, gloss lookup (using A's rule-based mapper), play clips in a chain with a speed control.
5. Build the web History page that reads the user's conversations and messages from Supabase.
6. Start the Learn content structure: lesson list by topic, each lesson lists signs to learn.
7. Test every clip: rest pose at start and end, no finger intersections, readable from the front.

Done when: the avatar can sign at least the first half of the ISL vocabulary and the web page plays them in sequence.

### Phase 3 - Web portal features and full ISL set (Weeks 8 to 10)

1. Finish the remaining ISL animations and verify the whole ISL vocabulary.
2. Run isl\_model.onnx in the browser with MediaPipe Tasks Web: webcam, keypoints, tensor builder, inference. Work with A on matching preprocessing exactly. If it is slow, use A's lighter web model.
3. Build the web Sign to Voice page: live webcam, recognised text, browser text-to-speech with emotion presets (pitch and rate).
4. Add output language choice on the web using a browser or lightweight translation approach agreed with the team. If an offline translation library is not practical in the browser, document that web translation needs internet and uses a free translation service.
5. Finish the web profile page with delete account, connected to B's delete flow.
6. Make web history and app history identical: confirm a conversation made on the phone appears on the web and the other way round.
7. Deploy the web portal to Vercel or Netlify and share the link.

Done when: the web portal does sign to voice and voice to sign for ISL and shows synced history.

### Phase 4 - ASL, Learn mode and web completion (Weeks 11 to 12)

1. Build ASL animations for the v1 vocabulary using the same hand-pose library. Many signs differ from ISL, so treat each as new.
2. Add the ISL and ASL switch on the web portal and load the ASL model from A.
3. Finish Learn content: lessons with signs, a short description of how to do each sign, practice prompts, and a quiz with 5 to 10 questions per lesson. Store lessons as JSON (or a Supabase table) so the app and web use the same content.
4. Build the web Learn pages: lesson player with the avatar and a speed control, practice with webcam (use A's similarity score), quiz, progress saved to learn\_progress.
5. Give B the final clip packs, manifest and lesson JSON.
6. Optimise clip sizes: compress GLB files, share one skeleton, so each pack stays under the size limit.

Done when: ISL and ASL avatars cover the vocabulary, and Learn mode works on web and is ready for the app.

### Phase 5 - Testing, security and handover (Weeks 13 to 14)

1. Test the web portal in Chrome, Edge, Firefox and on a phone browser.
2. Run web security checks together with B: no secret keys in the web repo, HTTPS is on, and the web app uses only the anon key.
3. Test delete account from the web portal: it must call B's delete flow and log the user out.
4. Keep the web source and avatar assets safely in GitHub and note how to redeploy the web portal.
5. Check the Vercel or Netlify free-plan limits and make sure the demo will not hit them.
6. Run avatar usability tests with signers and fix unclear signs.
7. Write the web, design and avatar sections of the report and a short admin guide.
8. Prepare the web and avatar demo for the final presentation.

Done when: web portal and avatar are stable, secure and documented.

## 6. Weekly checklist

- Report how many signs are animated against the target.
- Keep GLB files small and committed in /assets with the manifest updated.
- Keep the design tokens and components documented so the claymorphism style stays consistent.
- Bring a working web build to every Friday integration session.

## 7. Dependencies on the other members

| You need from | What | When |
| --- | --- | --- |
| A | Final vocabulary list and gloss ids | Phase 0 |
| A | Rule-based text-to-gloss mapper | Phase 2 |
| A | ONNX models (ISL, then ASL) and a lighter web version if needed | Phases 3 and 4 |
| A | Similarity function for practice mode | Phase 4 |
| B | Test feedback on avatar performance in SceneView | Phase 1 onward |
| B | Supabase URL, anon key, schema and RLS policies ready | Phase 1 |

What A and B need from you: test avatar (end of Phase 1), animation clips and manifest (Phases 2 to 4), lesson content (Phase 4).

## 8. Risks and fallbacks

| Risk | Fallback |
| --- | --- |
| Animating all signs takes too long | Reuse hand-shape poses, prioritise the most common signs, trim the vocabulary |
| Hand movements look unclear | Test with signers early, simplify the character hands, add slow-motion mode |
| Web model too slow | Smaller web vocabulary or lighter model from A, lower webcam resolution |
| Offline translation on web is not practical | Web uses an online translation service and the portal states this clearly |
| Backend unavailable during the demo (owned by B) | Ask B to confirm the project is awake before demos, and keep a recorded demo video as backup |
| ASL animations double the work | Finish ISL fully first and start ASL in Phase 4 with a smaller vocabulary if needed |

## 9. Definition of done for Member C

- The avatar signs every word in the v1 vocabulary for ISL and ASL, with approved clarity.
- The web portal covers all features F1 to F8 and shows the same history as the app.
- The web login, sign-up and delete-account flows work against B's Supabase backend with two test accounts.
- Lesson content is delivered to B, and all assets are on GitHub with instructions.

## 10. Design theme: claymorphism (web and avatar)

You own the design system for both the website and the app, using the tokens in the master document.

- Create the system in Figma in Phase 0: colours, shadows, radius, Nunito font, and the components (button, card, input, toggle, modal, tab bar).
- Build the same components in React with Tailwind: two outer shadows on raised items, inner shadow on pressed items and inputs, 28 px corner radius, pastel palette.
- Give B the Figma file and the tokens so the Compose app looks identical.
- Make the 3D avatar match: smooth rounded forms, matte pastel materials, simple soft lighting, large readable hands.
- Check contrast: text at least 4.5:1, dark text on pastel buttons, a high-contrast mode, and keyboard focus rings that stay visible.
- Check performance: use CSS shadows only on cards and buttons, not on every element, so pages stay fast on phones.
