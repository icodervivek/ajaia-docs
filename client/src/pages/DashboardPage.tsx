import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import ShareDialog from "../components/ShareDialog";
import { useAuth } from "../context/AuthContext";
import { apiFetch, ApiError } from "../lib/api";
import type { DocSummary, FullDocument } from "../lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [owned, setOwned] = useState<DocSummary[]>([]);
  const [shared, setShared] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ owned: DocSummary[]; shared: DocSummary[] }>("/api/documents");
      setOwned(res.owned);
      setShared(res.shared);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Re-load whenever the active demo user changes (the header's account
    // switcher swaps identity without a full page reload).
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await apiFetch<{ document: FullDocument }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({}),
      });
      navigate(`/documents/${res.document.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create document");
    } finally {
      setCreating(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch<{ document: FullDocument }>("/api/documents/import", {
        method: "POST",
        body: form,
      });
      navigate(`/documents/${res.document.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      setOwned((docs) => docs.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete document");
    }
  }

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-toolbar">
          <h1>My Documents</h1>
          <div className="dashboard-actions">
            <button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "+ New document"}
            </button>
            <button className="btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? "Importing…" : "Import .txt / .md"}
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.markdown" hidden onChange={handleImport} />
          </div>
        </div>
        <p className="muted small">Only .txt and .md files can be imported — each becomes a new editable document.</p>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <section>
              <h2 className="section-title">Owned by me</h2>
              {owned.length === 0 && <p className="muted small">No documents yet — create one to get started.</p>}
              <ul className="doc-list">
                {owned.map((d) => (
                  <li key={d.id} className="doc-row">
                    <Link to={`/documents/${d.id}`} className="doc-title">
                      {d.title}
                    </Link>
                    <span className="muted small">Updated {new Date(d.updatedAt).toLocaleString()}</span>
                    <div className="doc-row-actions">
                      <button className="btn-ghost small" onClick={() => setShareTarget({ id: d.id, title: d.title })}>
                        Share
                      </button>
                      <button className="btn-ghost small danger" onClick={() => handleDelete(d.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="section-title">Shared with me</h2>
              {shared.length === 0 && <p className="muted small">Nothing has been shared with you yet.</p>}
              <ul className="doc-list">
                {shared.map((d) => (
                  <li key={d.id} className="doc-row">
                    <Link to={`/documents/${d.id}`} className="doc-title">
                      {d.title}
                    </Link>
                    <span className="muted small">Owned by {d.owner?.name}</span>
                    <span className="badge">Shared</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      {shareTarget && (
        <ShareDialog docId={shareTarget.id} docTitle={shareTarget.title} onClose={() => setShareTarget(null)} />
      )}
    </Layout>
  );
}
