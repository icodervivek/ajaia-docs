# Ajaia Docs

A lightweight collaborative document editor — create, format, import, and share
rich-text documents. Built as a take-home assignment for Ajaia's Full Stack
Product Engineer role.

**Live product:** https://ajaia-docs-client.vercel.app
**Backend API:** https://ajaia-docs-server.vercel.app

## Try it now (no setup)

Open the live link above and pick any seeded demo account — there's no
password. Alice Chen already owns a "Welcome to Ajaia Docs" document shared
with Bilal Rahman, so sharing is visible immediately. Use the account switcher
in the top-right header to jump between users without logging out.

| User | Email |
|---|---|
| Alice Chen | alice@ajaia.demo |
| Bilal Rahman | bilal@ajaia.demo |
| Carmen Ruiz | carmen@ajaia.demo |

## What it does

- **Document editing** — create, rename, and edit rich-text documents (bold,
  italic, underline, strikethrough, headings H1–H3, bulleted/numbered lists,
  blockquotes). Content autosaves ~700ms after you stop typing and reopens
  exactly as you left it.
- **File import** — upload a `.txt` or `.md` file and it becomes a new
  editable document, converted into the same rich-text format used by the
  editor (headings, bold/italic, lists all carry over from Markdown). Other
  file types are rejected with a clear message, both client- and server-side.
- **Sharing** — a document has one owner. The owner can grant another seeded
  user edit access by email from a Share dialog, and revoke it. The dashboard
  visibly separates "Owned by me" from "Shared with me", and a shared
  document shows who owns it.
- **Persistence** — everything is stored in Postgres (Neon) via Prisma;
  content, titles, and sharing survive refreshes and redeploys.

## Tech stack

- **Frontend:** React 19 + Vite + TypeScript, [Tiptap](https://tiptap.dev)
  (ProseMirror) for the rich-text editor, React Router.
- **Backend:** Express + TypeScript, Prisma ORM, Postgres (Neon).
- **Auth:** mocked — a small set of seeded users, no passwords. Login issues a
  real signed JWT that every request is verified against, so the plumbing
  mirrors what real auth would look like. See [AI_WORKFLOW.md](./AI_WORKFLOW.md)
  and [ARCHITECTURE.md](./ARCHITECTURE.md) for why this scope was chosen.
- **Deployment:** two Vercel projects (client, server) from this one GitHub
  repo, each with its own Root Directory; the backend runs as a Vercel
  serverless function wrapping the same Express app used for local dev.
  Deploys are pushed manually via `vercel --prod` from each project
  directory rather than relying on Vercel's git-push auto-deploy — see
  "Known limitations" below.

## Local setup

Prerequisites: Node 20+, a Postgres database (a free
[Neon](https://neon.tech) project works well — the free tier is enough).

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string,
# and JWT_SECRET to any random string
npx prisma migrate deploy   # creates the schema
npm run seed                # creates 3 demo users + a shared demo document
npm run dev                 # starts on http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env.local   # VITE_API_URL=http://localhost:4000 by default
npm run dev                  # starts on http://localhost:5173
```

Open http://localhost:5173 and pick a demo account.

### Running tests

```bash
cd server
npm test
```

12 tests covering the Markdown/plain-text → rich-text import conversion and
the auth/routing guards (401 on missing/invalid tokens, 404 handling). See
[ARCHITECTURE.md](./ARCHITECTURE.md#testing) for what's covered vs. not.

## Known limitations

- **Supported import types:** `.txt` and `.md` only, capped at 2MB.
- **Sharing model:** binary — a document is either private to its owner or
  shared with full edit access to whoever it's shared with. No read-only or
  role-based permissions (see "What I'd build next" below).
- **Auth is mocked.** This is intentional scope discipline for a 4–6 hour
  timebox, not an oversight — see the AI workflow and architecture notes.
- **Vercel's git-push auto-deploy doesn't work for this repo.** Every
  push-triggered build fails in Vercel's own build pipeline (a reproducible
  `Cannot read properties of undefined (reading 'fsPath')` on the server
  project, a stale-cache `vite: command not found` on the client project) —
  confirmed across many different `vercel.json` configurations, all of
  which deploy successfully when pushed directly via `vercel --prod` from
  the CLI. This points to a bug in the older internal builder Vercel's git
  integration uses for this project, not something fixable from repo
  config. Deploys are done manually: `cd server && vercel --prod` /
  `cd client && vercel --prod`.

## What's working / incomplete / next

**Working end-to-end:** document creation, rename, rich-text editing with
autosave, persistence across reloads, `.txt`/`.md` import, sharing (grant +
revoke), owned-vs-shared distinction, access control (a non-owner can't
delete or manage sharing; a user with no access gets a 403), demo account
switching, deployed and reachable at the live URL above.

**Incomplete / not attempted:** real-time multi-cursor collaboration, comment
threads, version history, PDF/Markdown export, granular (viewer vs. editor)
permissions, real authentication.

**With another 2–4 hours I'd build:** (1) document version history —
the data model already timestamps every update, so snapshotting on save is
the natural next step; (2) read-only sharing as a second permission level;
(3) debounced-save conflict handling for two people editing the same doc at
once (right now the last write wins, which is fine for the demo but not for
real concurrent editing).

## Repo layout

```
client/   React + Vite frontend
server/   Express + Prisma backend (also the Vercel serverless entry, api/index.ts)
```

## Documents in this repo

- [ARCHITECTURE.md](./ARCHITECTURE.md) — what was prioritized and why
- [AI_WORKFLOW.md](./AI_WORKFLOW.md) — how AI tools were used on this project
- [SUBMISSION.md](./SUBMISSION.md) — checklist of everything included


