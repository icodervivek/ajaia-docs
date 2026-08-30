import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import type { ShareEntry } from "../lib/types";

export default function ShareDialog({
  docId,
  docTitle,
  onClose,
}: {
  docId: string;
  docTitle: string;
  onClose: () => void;
}) {
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    // The document detail response includes the current shares list when
    // the requester is the owner (see GET /api/documents/:id).
    const doc = await apiFetch<{ shares: ShareEntry[] }>(`/api/documents/${docId}`);
    setShares(doc.shares);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ shares: ShareEntry[] }>(`/api/documents/${docId}/share`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setShares(res.shares);
      setEmail("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to share document");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(userId: string) {
    await apiFetch(`/api/documents/${docId}/shares/${userId}`, { method: "DELETE" });
    setShares((s) => s.filter((x) => x.userId !== userId));
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share "{docTitle}"</h2>
        <p className="muted small">Anyone you add gets full edit access to this document.</p>

        <form onSubmit={handleShare} className="share-form">
          <input
            type="email"
            placeholder="teammate@ajaia.demo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Sharing…" : "Share"}
          </button>
        </form>
        {error && <div className="error-banner">{error}</div>}

        <h3 className="muted small" style={{ marginTop: "1rem" }}>
          People with access
        </h3>
        <ul className="share-list">
          {shares.length === 0 && <li className="muted small">Not shared with anyone yet.</li>}
          {shares.map((s) => (
            <li key={s.userId}>
              <span>
                {s.name} <span className="muted small">({s.email})</span>
              </span>
              <button className="btn-ghost small" onClick={() => handleRevoke(s.userId)}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
