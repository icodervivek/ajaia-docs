import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db";
import { AuthedRequest, requireAuth } from "../auth";
import { BadRequest, Forbidden, NotFound } from "../lib/errors";
import { importFileToTiptap } from "../lib/importDoc";
import { shouldSnapshotVersion } from "../lib/versioning";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB is plenty for text/markdown
  fileFilter: (_req, file, cb) => {
    const ok = /\.(txt|md|markdown)$/i.test(file.originalname);
    if (!ok) return cb(new Error("UNSUPPORTED_FILE_TYPE"));
    cb(null, true);
  },
});

const createSchema = z.object({ title: z.string().trim().min(1).max(200).optional() });
const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.record(z.string(), z.any()).optional(),
});
const shareSchema = z.object({ email: z.string().trim().email() });

async function loadAccessible(docId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!doc) throw NotFound("Document not found");

  const isOwner = doc.ownerId === userId;
  const share = isOwner
    ? null
    : await prisma.documentShare.findUnique({
        where: { documentId_userId: { documentId: docId, userId } },
      });

  if (!isOwner && !share) throw Forbidden("You do not have access to this document");
  return { doc, isOwner };
}

// GET /api/documents  -> documents I own + documents shared with me
router.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const [owned, sharedRows] = await Promise.all([
      prisma.document.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      }),
      prisma.documentShare.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              updatedAt: true,
              owner: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ]);

    const shared = sharedRows.map((s) => ({
      id: s.document.id,
      title: s.document.title,
      createdAt: s.document.createdAt,
      updatedAt: s.document.updatedAt,
      owner: s.document.owner,
    }));

    res.json({ owned, shared });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents  -> create a new blank document
router.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw BadRequest(parsed.error.issues[0]?.message ?? "Invalid body");

    const doc = await prisma.document.create({
      data: {
        title: parsed.data.title || "Untitled document",
        ownerId: req.user!.id,
      },
    });
    res.status(201).json({ document: doc });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/import  -> upload a .txt/.md file, creates a new document
router.post("/import", (req: AuthedRequest, res, next) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) {
        if (err.message === "UNSUPPORTED_FILE_TYPE") {
          throw BadRequest("Only .txt and .md files are supported for import");
        }
        throw BadRequest(err.message || "Upload failed");
      }
      if (!req.file) throw BadRequest("No file provided (field name must be 'file')");

      const { title, content } = importFileToTiptap(req.file.originalname, req.file.buffer);
      const doc = await prisma.document.create({
        data: { title, content: content as any, ownerId: req.user!.id },
      });
      res.status(201).json({ document: doc });
    } catch (e) {
      next(e);
    }
  });
});

// GET /api/documents/:id
router.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const { doc, isOwner } = await loadAccessible(req.params.id, req.user!.id);
    let shares: { userId: string; name: string; email: string }[] = [];
    if (isOwner) {
      const rows = await prisma.documentShare.findMany({
        where: { documentId: doc.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      shares = rows.map((r) => ({ userId: r.user.id, name: r.user.name, email: r.user.email }));
    }
    res.json({ document: doc, isOwner, shares });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/documents/:id  -> rename and/or edit content (owner or shared collaborator)
router.patch("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const { doc } = await loadAccessible(req.params.id, req.user!.id);
    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw BadRequest(parsed.error.issues[0]?.message ?? "Invalid body");
    if (parsed.data.title === undefined && parsed.data.content === undefined) {
      throw BadRequest("Provide at least one of title or content");
    }

    // Snapshot the document's *current* state before overwriting it with a
    // content change, throttled so the autosave debounce (~700ms) doesn't
    // flood the history -- see lib/versioning.ts for the policy.
    if (parsed.data.content !== undefined) {
      const lastVersion = await prisma.documentVersion.findFirst({
        where: { documentId: doc.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (shouldSnapshotVersion(lastVersion?.createdAt ?? null, new Date())) {
        await prisma.documentVersion.create({
          data: {
            documentId: doc.id,
            title: doc.title,
            content: doc.content as any,
            createdById: req.user!.id,
          },
        });
      }
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.content !== undefined ? { content: parsed.data.content as any } : {}),
      },
    });
    res.json({ document: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/versions  -> version history, most recent first
router.get("/:id/versions", async (req: AuthedRequest, res, next) => {
  try {
    const { doc } = await loadAccessible(req.params.id, req.user!.id);
    const rows = await prisma.documentVersion.findMany({
      where: { documentId: doc.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const createdByIds = [...new Set(rows.map((r) => r.createdById))];
    const users = await prisma.user.findMany({
      where: { id: { in: createdByIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    res.json({
      versions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.createdAt,
        createdBy: nameById.get(r.createdById) ?? "Unknown",
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/versions/:versionId/restore
// -> owner or shared collaborator; replaces current content with a past
//    version's content, after checkpointing the current state first so the
//    moment right before a restore is never silently lost.
router.post("/:id/versions/:versionId/restore", async (req: AuthedRequest, res, next) => {
  try {
    const { doc } = await loadAccessible(req.params.id, req.user!.id);
    const version = await prisma.documentVersion.findUnique({ where: { id: req.params.versionId } });
    if (!version || version.documentId !== doc.id) throw NotFound("Version not found");

    await prisma.documentVersion.create({
      data: { documentId: doc.id, title: doc.title, content: doc.content as any, createdById: req.user!.id },
    });

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { title: version.title, content: version.content as any },
    });
    res.json({ document: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id  -> owner only
router.delete("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw NotFound("Document not found");
    if (doc.ownerId !== req.user!.id) throw Forbidden("Only the owner can delete this document");
    await prisma.document.delete({ where: { id: doc.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/share  -> owner only, grant access by email
router.post("/:id/share", async (req: AuthedRequest, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw NotFound("Document not found");
    if (doc.ownerId !== req.user!.id) throw Forbidden("Only the owner can share this document");

    const parsed = shareSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw BadRequest("A valid email is required");

    const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!target) throw BadRequest("No user with that email");
    if (target.id === doc.ownerId) throw BadRequest("This user already owns the document");

    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: doc.id, userId: target.id } },
      create: { documentId: doc.id, userId: target.id },
      update: {},
    });

    const rows = await prisma.documentShare.findMany({
      where: { documentId: doc.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json({ shares: rows.map((r) => ({ userId: r.user.id, name: r.user.name, email: r.user.email })) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id/shares/:userId  -> owner only, revoke access
router.delete("/:id/shares/:userId", async (req: AuthedRequest, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw NotFound("Document not found");
    if (doc.ownerId !== req.user!.id) throw Forbidden("Only the owner can modify sharing");

    await prisma.documentShare.deleteMany({
      where: { documentId: doc.id, userId: req.params.userId },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
