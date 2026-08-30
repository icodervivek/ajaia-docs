import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../expressApp";

// These tests only exercise routing/middleware behavior that doesn't touch
// the database (health check, auth guard, 404s), so they run without a
// Postgres connection -- useful in CI or a fresh checkout before DATABASE_URL
// is configured. Access-control logic that does need the DB (loadAccessible,
// share ownership checks) is covered by /README.md's manual test plan.
const app = createApp();

describe("GET /api/health", () => {
  it("returns ok:true", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("auth guard", () => {
  it("rejects document routes with no Authorization header", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authorization/i);
  });

  it("rejects an invalid bearer token", async () => {
    const res = await request(app).get("/api/documents").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("rejects document creation with no auth", async () => {
    const res = await request(app).post("/api/documents").send({ title: "Nope" });
    expect(res.status).toBe(401);
  });
});

describe("unknown routes", () => {
  it("returns 404 with a JSON body", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});
