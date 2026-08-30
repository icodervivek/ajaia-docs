# Architecture Note

## The 30-second version

A small React SPA talks to a stateless Express API over JSON + a bearer
token; the API is the only thing that touches Postgres (via Prisma). No
server-side rendering, no BFF layer, no message queue — the simplest shape
that supports the four required capabilities (edit, import, share, persist)
cleanly.

```
React (Vite, Tiptap editor)  →  Express API (JWT auth)  →  Postgres (Neon, via Prisma)
      Vercel (static)              Vercel (serverless fn)
```

## What I prioritized, and why

**1. A genuinely usable editor over a wider feature set.**
Tiptap/ProseMirror does the hard part (schema-valid rich text, undo/redo,
keyboard shortcuts) so I could spend the time budget on making the toolbar,
autosave, and formatting *feel* coherent rather than reimplementing a text
editor. The content is stored as ProseMirror JSON (Postgres `jsonb`), not
HTML — it's the format the editor already produces and consumes, so there's
no serialization step to get subtly wrong, and it's trivially diffable/
inspectable if I needed to debug stored content (which I did, more than
once, while chasing down editor bugs during testing).

**2. Real access control over a bigger permission model.**
Sharing is intentionally binary: a document is private to its owner, or
shared with full edit access. I considered adding a read-only role, but
decided a *correctly enforced* two-state model (verified with actual
cross-user tests — a non-owner genuinely cannot delete or manage sharing;
someone with no access gets a real 403, not just a hidden button) was worth
more than a three-state model I didn't have time to verify as thoroughly.
The access check (`loadAccessible` in `documentRoutes.ts`) is one function
every document route funnels through, so there's a single place that
decides "can this user see this document" — deliberately not duplicated
per-route logic that could drift out of sync.

**3. Mock auth, done honestly rather than half-real.**
Real authentication (password hashing, sessions, email verification) is a
solved problem that wouldn't have demonstrated anything about my judgment on
*this* assignment, and building a shallow version of it would have been
worse than skipping it. Instead: a small set of seeded users, "login" is
picking one, and the server issues a normal signed JWT that's verified on
every request. The point was to keep the request-authorization plumbing
identical to what real auth would need (a token, a middleware that verifies
it, a `req.user`) while being upfront that identity itself isn't verified.
This is called out in the README's login screen copy, not hidden.

**4. Markdown import via manual token-walking over pulling in a DOM parser.**
Converting `.md` into the editor's rich-text format needed *some* HTML/DOM
parser if I used Tiptap's own `generateJSON()` helper server-side (it needs
jsdom, since there's no browser DOM in Node). Given the scope only needed to
carry headings, bold/italic/strike, paragraphs, and lists across, I instead
walked `marked`'s token tree directly into the same JSON shape the editor
already produces (`server/src/lib/importDoc.ts`). It's less general than a
full HTML pipeline, but it's a plain pure function I could unit test
directly (see `importDoc.test.ts`) without spinning up a DOM.

## What I deliberately did not build

- **Real-time collaboration** (multi-cursor, live co-editing). The autosave
  model (debounced PATCH on change, last write wins) is fine for the
  "share a document" use case this assignment asks for, but two people
  editing the *same* paragraph at the *same* moment would clobber each
  other. Solving that properly means CRDTs or OT (Tiptap ships a
  Yjs-collaboration extension, but wiring up a sync server was out of scope
  for the timebox).
- **Version history** was cut from the original list here and then built as
  the one stretch enhancement (see below) — the schema's `updatedAt` was
  exactly the signal that made it the natural next step.
- **Comments/suggestions, PDF export, granular roles** — all reasonable
  extensions, all cut to keep the core flows deep rather than shallow.

## Data model

```
User            — seeded demo identity (name, email)
Document        — title, content (ProseMirror JSON), ownerId, timestamps
DocumentShare   — (documentId, userId) join table = "this user has edit access"
DocumentVersion — (documentId, title, content, createdById, createdAt) checkpoint
```

Four tables. No polymorphic permission table, no separate "role" enum on
sharing — because the actual permission model in this app is exactly two
states, and a table that already encodes more flexibility than the product
needs is speculative complexity, not a feature. `DocumentVersion` is a plain
append-only log, deliberately not a diff/patch structure — full snapshots
are simpler to reason about and restore from at this scale.

## Stretch: version history

The one optional enhancement I built (the assignment explicitly asks for
one, not several — see AI_WORKFLOW.md for how that scope decision was made).

**Throttled, not on-every-save.** Autosave fires ~700ms after the user
stops typing; snapshotting on every one of those would flood the history
with near-duplicate entries within seconds of each other. A version is only
checkpointed if the last one for that document is more than 3 minutes old
(`server/src/lib/versioning.ts`, unit tested directly since it's a pure
function of two timestamps).

**Checkpoint-before-restore.** Restoring a version first snapshots the
document's *current* state, then overwrites it with the chosen version's
content. This means restoring is non-destructive by construction — even a
restore you didn't mean to do is itself just another version away from
undoing.

**Access follows edit access.** Anyone who can edit a document (owner or
shared) can view and restore its history, consistent with the app's
existing binary sharing model rather than introducing a third permission
tier just for this feature.

## Deployment shape

Two Vercel projects from one GitHub repo (`client`, `server` as separate
Root Directories). The backend is the same Express app in both places —
`server/src/index.ts` boots it as a normal long-lived server for local dev,
`server/api/index.ts` exports the identical app for Vercel's serverless
runtime. Nothing in the route/middleware code is Vercel-specific; the
adapter is the only Vercel-aware file. Postgres is Neon (serverless-friendly
connection pooling), the same database for local dev and production.

Deploys are pushed manually (`vercel --prod` from each project directory)
rather than via git-triggered auto-deploy — see the README's "Known
limitations" for why: a reproducible bug in Vercel's own git-integration
build pipeline for this project, confirmed independent of `vercel.json`
configuration, that does not occur on direct CLI deploys.

## Testing

17 automated tests (Vitest), three files: pure unit tests for the Markdown/
plain-text → rich-text conversion (headings, bold/italic marks, list
structure, edge cases like empty input) and for the version-snapshot
throttle policy, plus integration tests for the Express app's auth guard
and routing (401 on missing/invalid tokens, 404 handling) that run without
a database connection. What's *not* covered by automated tests: the
Prisma-backed access-control paths (share/revoke, cross-user 403s, version
restore) — those were verified manually and via direct API calls against
the real database during development (see AI_WORKFLOW.md), not scripted
into the suite, which is the honest gap here given the time box.
