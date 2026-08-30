import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import documentRoutes from "./routes/documentRoutes";
import { HttpError } from "./lib/errors";

export function createApp() {
  const app = express();

  // This is a dynamic API -- nothing here should ever be cached by Vercel's
  // edge/CDN layer. Registered *before* cors() deliberately: the cors
  // middleware fully answers and ends OPTIONS preflight requests itself
  // (it never calls next() for them), so anything registered after it
  // never runs for OPTIONS. Without this running first, a stale cached
  // preflight response -- e.g. one captured without a proper Origin header
  // during testing -- can get served back to real browsers indefinitely,
  // missing CORS headers and silently breaking every non-GET request with
  // an opaque "Failed to fetch" (no error surfaces server-side, since the
  // request never reaches this app at all).
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/documents", documentRoutes);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  // Centralized error handler -- every route forwards errors via next(err)
  // rather than handling status codes ad hoc.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
