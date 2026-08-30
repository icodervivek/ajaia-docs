# Submission Checklist

## Live links

- **Product (frontend):** https://ajaia-docs-client.vercel.app
- **API (backend):** https://ajaia-docs-server.vercel.app
- **Source code:** https://github.com/icodervivek/ajaia-docs
- **Walkthrough video:** see `walkthrough-video-link.txt` in this folder

## Demo accounts (no password — see login screen)

| User | Email |
|---|---|
| Alice Chen | alice@ajaia.demo |
| Bilal Rahman | bilal@ajaia.demo |
| Carmen Ruiz | carmen@ajaia.demo |

Alice already owns a document ("Welcome to Ajaia Docs") shared with Bilal,
so the sharing flow is visible immediately without any setup.

## What's included in this folder

- [`README.md`](./README.md) — what the product does, tech stack, local
  setup/run instructions, known limitations, working/incomplete/next
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — architecture note: what was
  prioritized and why, what was deliberately left out
- [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) — AI tool usage note
- [`SUBMISSION.md`](./SUBMISSION.md) — this file
- [`walkthrough-video-link.txt`](./walkthrough-video-link.txt) — video URL
- `client/` — React + Vite + TypeScript frontend source
- `server/` — Express + TypeScript + Prisma backend source (includes tests)

Source code lives in the GitHub repo linked above and is mirrored in this
Drive folder as a zip/copy for convenience — the GitHub repo is the
canonical, buildable copy (`git clone` + follow README setup).

## Feature checklist against the assignment

- [x] Create, rename, edit documents; browser-based rich text (bold,
      italic, underline, headings, bulleted/numbered lists)
- [x] Save and reopen — content persists across reloads
- [x] File upload — `.txt`/`.md` import becomes a new editable document
      (unsupported types clearly rejected, in the UI and this README)
- [x] Sharing — owner, grant-access-by-email, revoke, visible
      owned-vs-shared distinction
- [x] Persistence — Postgres (Neon) via Prisma
- [x] Setup/run instructions — see README
- [x] Working deployment — both links above, live-tested
- [x] Basic validation and error handling — zod request validation,
      centralized error handler, clear UI error states
- [x] At least one meaningful automated test — 12 tests (see README/
      ARCHITECTURE for what's covered)
- [x] Architecture note — ARCHITECTURE.md
- [x] AI workflow note — AI_WORKFLOW.md
- [x] Walkthrough video — see link file
- [ ] Optional stretch — not attempted; see "What I'd build next" in
      README for what I'd prioritize with more time instead
