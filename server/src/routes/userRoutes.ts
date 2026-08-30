import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// Public list of seeded users so the frontend can render a "log in as"
// picker. Fine for a mock-auth take-home; would never expose this in a
// real product.
router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

export default router;
