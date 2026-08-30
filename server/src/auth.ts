import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "./db";

// --- MOCK AUTH ---
// This is a take-home assignment: there is no password/identity provider.
// "Logging in" means picking one of a small set of seeded users. We still
// issue a real signed JWT and verify it on every request, so the request
// pipeline mirrors how real auth would plug in later.

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

export interface AuthedRequest extends Request {
  user?: { id: string; name: string; email: string };
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: "User for this token no longer exists" });
    }
    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
