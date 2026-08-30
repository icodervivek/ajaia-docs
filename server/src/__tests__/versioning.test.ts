import { describe, it, expect } from "vitest";
import { shouldSnapshotVersion, VERSION_MIN_INTERVAL_MS } from "../lib/versioning";

describe("shouldSnapshotVersion", () => {
  it("snapshots when there is no prior version", () => {
    expect(shouldSnapshotVersion(null, new Date())).toBe(true);
  });

  it("does not snapshot again immediately after a recent version", () => {
    const now = new Date("2026-01-01T00:10:00Z");
    const last = new Date("2026-01-01T00:09:30Z"); // 30s ago
    expect(shouldSnapshotVersion(last, now)).toBe(false);
  });

  it("does not snapshot just under the interval boundary", () => {
    const now = new Date("2026-01-01T00:10:00Z");
    const last = new Date(now.getTime() - VERSION_MIN_INTERVAL_MS + 1000); // 1s short
    expect(shouldSnapshotVersion(last, now)).toBe(false);
  });

  it("snapshots once the interval has fully elapsed", () => {
    const now = new Date("2026-01-01T00:10:00Z");
    const last = new Date(now.getTime() - VERSION_MIN_INTERVAL_MS); // exactly at boundary
    expect(shouldSnapshotVersion(last, now)).toBe(true);
  });

  it("snapshots when the last version is long in the past", () => {
    const now = new Date("2026-01-01T00:10:00Z");
    const last = new Date("2025-01-01T00:00:00Z");
    expect(shouldSnapshotVersion(last, now)).toBe(true);
  });
});
