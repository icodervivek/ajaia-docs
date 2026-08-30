// Version-history snapshot policy, kept as a pure function so it's testable
// without a database. Autosave fires on every debounced keystroke pause
// (~700ms), so snapshotting on every save would flood the history with
// near-duplicate entries within seconds of each other. Instead we only
// checkpoint when enough time has passed since the last snapshot for this
// document -- frequent enough to be a useful timeline, sparse enough to
// stay readable.
export const VERSION_MIN_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function shouldSnapshotVersion(lastVersionCreatedAt: Date | null, now: Date): boolean {
  if (!lastVersionCreatedAt) return true;
  return now.getTime() - lastVersionCreatedAt.getTime() >= VERSION_MIN_INTERVAL_MS;
}
