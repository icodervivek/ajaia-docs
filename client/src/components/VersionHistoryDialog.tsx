import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import type { FullDocument, VersionEntry } from "../lib/types";

export default function VersionHistoryDialog({
  docId,
  docTitle,
  onClose,
  onRestored,
}: {
  docId: string;
  docTitle: string;
  onClose: () => void;
  onRestored: (document: FullDocument) => void;
}) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ versions: VersionEntry[] }>(`/api/documents/${docId}/versions`)
      .then((res) => setVersions(res.versions))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load version history"))
      .finally(() => setLoading(false));
  }, [docId]);

  async function handleRestore(versionId: string) {
    setConfirmingId(null);
    setRestoringId(versionId);
    setError(null);
    try {
      const res = await apiFetch<{ document: FullDocument }>(
        `/api/documents/${docId}/versions/${versionId}/restore`,
        { method: "POST" }
      );
      onRestored(res.document);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to restore this version");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Version history</h2>
        <p className="muted small">
          Checkpoints of "{docTitle}" are saved automatically as you edit (at most one every few
          minutes), so you can step back to an earlier state.
        </p>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted small">Loading versions…</p>
        ) : versions.length === 0 ? (
          <p className="muted small">
            No earlier checkpoints yet — keep editing for a bit and they'll start appearing here.
          </p>
        ) : (
          <ul className="version-list">
            {versions.map((v) => (
              <li key={v.id} className="version-list-item">
                <div>
                  <div className="version-title">{v.title}</div>
                  <div className="muted small">
                    {formatRelativeTime(v.createdAt)} &middot; by {v.createdBy}
                  </div>
                </div>
                {confirmingId === v.id ? (
                  <span className="version-confirm">
                    <span className="muted small">Restore? Current content is checkpointed first.</span>
                    <button className="small" onClick={() => handleRestore(v.id)} disabled={restoringId !== null}>
                      {restoringId === v.id ? "Restoring…" : "Yes, restore"}
                    </button>
                    <button
                      className="btn-ghost small"
                      onClick={() => setConfirmingId(null)}
                      disabled={restoringId !== null}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn-ghost small"
                    onClick={() => setConfirmingId(v.id)}
                    disabled={restoringId !== null}
                  >
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}
