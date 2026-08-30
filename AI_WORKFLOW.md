# AI Workflow Note

## Tools used

**Claude Code** (Sonnet 5) was the primary tool for this entire build —
scaffolding, implementation, debugging, live browser-based QA, and
deployment, all in one working session. No other AI coding tool was used.

## Where it materially sped things up

**Full-stack scaffolding.** Standing up a typed Express + Prisma backend and
a Vite + React + Tiptap frontend, wired together, would normally eat a
meaningful chunk of a 4–6 hour budget on boilerplate alone. Claude Code
wrote the initial routes, schema, and React structure in minutes, which
left the actual time budget for the parts that needed judgment: the access
control model, the Markdown→rich-text conversion, and testing it for real.

**The Markdown import converter.** Walking `marked`'s token tree into
Tiptap/ProseMirror JSON by hand (`server/src/lib/importDoc.ts`) is fiddly,
mechanical code — recursive inline-mark handling, list nesting, heading
depth clamping. Claude Code wrote the first version end-to-end; my job was
mostly deciding the scope (which node/mark types to support) and then
verifying the output was actually correct JSON the editor could render,
which the unit tests in `importDoc.test.ts` do directly.

**Live browser QA, not just code review.** This is the part that would
normally get skipped or rushed in a solo take-home. Claude Code used its
browser automation to actually click through the app as two different
seeded users — create, format, rename, reload, share, switch accounts,
import a file, upload a rejected file type — against the real deployed
database, and caught two genuine bugs doing it (below). Reading the code
and believing it works is not the same as watching it work.

**Deployment debugging from raw logs.** When the deployed backend crashed
on the bare `/` route, I pasted the Vercel deployment log output straight
into the chat. Claude Code read `Invalid export found in module
"/var/task/src/app.js". The default export must be a function or server.`
and correctly diagnosed that Vercel's zero-config Express detection was
building `src/app.ts` as an *implicit second function* alongside the
explicit one, competing for the same route — a genuinely non-obvious
platform interaction I would not have guessed from the error message alone
in the time I'd have wanted to spend on it.

## What I changed or rejected

- **A duplicate Tiptap extension.** The first editor version explicitly
  added `@tiptap/extension-underline` on top of `StarterKit`. Tiptap v3's
  `StarterKit` already bundles Underline; the console threw a
  duplicate-extension warning during testing. I had Claude Code remove the
  redundant import and dependency rather than ignore the warning.
- **A nonsensical prop expression.** At one point a fix pass produced
  `editable={isOwner || true}` — which always evaluates to `true`, so the
  `isOwner` check was dead code. I caught this on review and had it
  simplified to plain `editable`, since anyone with access to a shared
  document is meant to have edit rights in this app's model anyway.
- **Multer 1.x.** `npm install` surfaced a deprecation warning that Multer
  1.x has known vulnerabilities patched in 2.x. Rather than let that ride, I
  had it bumped to Multer 2.x and re-verified the upload flow still worked.
- **Commit message trailers.** Claude Code's default commit messages
  included `Co-Authored-By` / session-link trailers. I didn't want that
  noise in a public repo's history, said so, and had the existing commits
  rewritten (not just future ones changed) to remove them.
- **A stray "phantom" bullet during manual testing.** While testing
  sharing, a browser-automation pass showed an extra list item that I
  hadn't typed. Rather than accept that as an app bug, Claude Code traced
  it by checking the raw stored JSON via the API directly, deleting the
  test document, and redoing an isolated, carefully-paced test — which
  confirmed it was a UI-automation click-timing artifact, not real data
  corruption. In the process it *did* find a real, separate bug worth
  fixing: the editor didn't remount when navigating between documents
  client-side (missing a React `key`), and the dashboard/document pages
  didn't refresh when the demo "current user" was switched mid-session.
  Both were fixed and re-verified.
- **Scope creep on the optional stretch feature.** When asked to build all
  five stretch ideas from the assignment (real-time collab, comments,
  version history, export, RBAC), Claude Code pushed back rather than just
  building them — the assignment explicitly asks for *one* small
  enhancement and warns against sacrificing core functionality, and
  building five shallow features at the end would work against exactly the
  scope-discipline judgment this assessment is testing for. We picked one
  (version history) that fit the existing schema cleanly.
- **Native `confirm()` dialogs.** The first pass of the delete and
  version-restore flows used `window.confirm()`. Claude Code caught this
  itself as inconsistent with the rest of the app's modal-based UI (and a
  risk to the automated browser testing the session relied on) and replaced
  both with an inline confirm-in-place UI, without me having to ask.

## How correctness, UX, and reliability were verified

- **Automated tests actually run, not just written.** 12 Vitest tests: pure
  unit tests for the Markdown/plain-text converter's exact JSON output
  (heading levels, bold/italic marks, list nesting, empty-input edge case),
  and integration tests for the Express auth guard and routing (401 on
  missing/invalid tokens, 404 handling) that don't require a database
  connection.
- **Real cross-user testing against the live database**, not just one
  happy path: created a document as one seeded user, shared it, switched to
  the second user via the account switcher, confirmed the shared document
  appeared under "Shared with me" with correct badging, confirmed edit
  access actually worked, and confirmed a 403 on an unauthorized delete
  attempt — via the actual UI, not just the API.
- **Direct API smoke tests after every deploy** (`curl` against the live
  Vercel URLs) for health, user listing, unauthenticated 401s, and unknown
  routes — to catch deployment-specific regressions like the two bugs
  described above, which unit tests alone would not have surfaced (they're
  platform/routing issues, not application logic issues).
- **Manual verification of persistence**: created and formatted content,
  did a full page reload (not just a client-side navigation), and confirmed
  the exact rich-text structure survived — this is what caught that
  autosave and reload were actually wired correctly end-to-end, not just
  that the API endpoints existed.
