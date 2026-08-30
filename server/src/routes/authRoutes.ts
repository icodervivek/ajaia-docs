import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { signToken } from "../auth";
import { BadRequest } from "../lib/errors";

const router = Router();

const loginSchema = z.object({ userId: z.string().min(1) });

// Mock login: the client picks one of the seeded users (see GET /api/users)
// and we issue a signed JWT for that identity. No password -- see README /
// AI_WORKFLOW note for why this scope was chosen.
router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw BadRequest("userId is required");

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) throw BadRequest("Unknown user");

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
});

export default router;
