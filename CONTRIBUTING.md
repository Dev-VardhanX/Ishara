# Contributing to Ishara

## Branches
- `main`: always works; only updated by pull request from `dev` at the end of each phase.
- `dev`: integration branch; all feature branches merge here.
- Feature branches: `feature/<area>-<short-name>` (areas: `ml`, `android`, `backend`, `web`, `assets`, `design`, `docs`).
- Bug fixes: `fix/<area>-<short-name>`.

## Rules
1. Never push directly to `main` or `dev`. Open a pull request.
2. Every pull request needs at least 1 review from another member and must build/run.
3. Keep pull requests small (one feature or fix).
4. Commit messages: `area: short description` (e.g. `android: add camera preview`).
5. **Never commit secrets** (API keys, `.env`, `local.properties`, keystores). Use the `.env.example` files.
6. Large binary files (`.onnx`, `.glb`, `.zip`, `.npy`) go through Git LFS (already set in `.gitattributes`).
7. Do not edit another member's folder without asking; open an issue or comment on a PR instead.
8. Shared contracts in `docs/contracts/` and `design/` change only after all three agree.

## Weekly routine
- Stand-up twice a week (15 minutes).
- Friday integration session: everyone brings a working build; merge `feature/*` into `dev`.
- End of each phase: pull request `dev` -> `main` and tag a release (`v0.1`, `v0.2`, ...).

## Phases
P0 setup (week 1) | P1 foundations (2-4) | P2 core ISL pipeline (5-7) | P3 languages, history, sync, web (8-10) |
P4 ASL, learn mode, polish (11-12) | P5 testing and demo (13-14).
