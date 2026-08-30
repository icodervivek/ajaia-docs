import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { JSONContent } from "@tiptap/react";
import Layout from "../components/Layout";
import Editor from "../components/Editor";
import ShareDialog from "../components/ShareDialog";
import VersionHistoryDialog from "../components/VersionHistoryDialog";
import { useAuth } from "../context/AuthContext";
import { apiFetch, ApiError } from "../lib/api";
import type { FullDocument } from "../lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [doc, setDoc] = useState<FullDocument | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Bumped only when a version restore replaces content out from under the
  // editor (title renames don't need this -- they don't touch content).
  const [contentRevision, setContentRevision] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    setDoc(null);
    setError(null);
    apiFetch<{ document: FullDocument; isOwner: boolean }>(`/api/documents/${id}`)
      .then((res) => {
        setDoc(res.document);
        setIsOwner(res.isOwner);
        setTitle(res.document.title);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load document"));
    // Re-fetch on user switch too, so the account switcher immediately
    // reflects the new user's access (owner vs shared vs 403) for whatever
    // document is currently open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const saveContent = useCallback(
    (content: JSONContent) => {
      if (!id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = setTimeout(async () => {
        try {
          await apiFetch(`/api/documents/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ content }),
          });
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      }, 700);
    },
    [id]
  );

  async function saveTitle() {
    if (!id || !doc) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === doc.title) {
      setTitle(doc.title);
      return;
    }
    try {
      const res = await apiFetch<{ document: FullDocument }>(`/api/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed }),
      });
      setDoc(res.document);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to rename document");
      setTitle(doc.title);
    }
  }

  function handleRestored(restored: FullDocument) {
    setDoc(restored);
    setTitle(restored.title);
    setSaveState("saved");
    setContentRevision((n) => n + 1);
  }

  if (error) {
    return (
      <Layout>
        <div className="error-banner">{error}</div>
        <Link to="/dashboard">← Back to documents</Link>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout>
        <p className="muted">Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="document-page">
        <div className="document-header">
          <Link to="/dashboard" className="btn-ghost small">
            ← Back
          </Link>
          <input
            className="title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            aria-label="Document title"
          />
          <span className="save-indicator muted small">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Saved"}
            {saveState === "error" && "Failed to save"}
          </span>
          <div className="document-header-actions">
            {!isOwner && <span className="badge">Shared by {doc.owner.name}</span>}
            <button className="btn-ghost small" onClick={() => setHistoryOpen(true)}>
              History
            </button>
            {isOwner && (
              <button className="btn-ghost small" onClick={() => setShareOpen(true)}>
                Share
              </button>
            )}
          </div>
        </div>

        {/* key includes contentRevision (not just doc.id) so restoring a
            version -- which replaces content without changing id or
            navigating -- also forces a fresh Tiptap instance. useEditor only
            reads its `content` option once, on creation, so without this the
            editor would keep showing stale content after a restore. */}
        <Editor
          key={`${doc.id}-${contentRevision}`}
          content={doc.content as JSONContent}
          editable
          onChange={saveContent}
        />
      </div>

      {shareOpen && <ShareDialog docId={doc.id} docTitle={doc.title} onClose={() => setShareOpen(false)} />}
      {historyOpen && (
        <VersionHistoryDialog
          docId={doc.id}
          docTitle={doc.title}
          onClose={() => setHistoryOpen(false)}
          onRestored={handleRestored}
        />
      )}
    </Layout>
  );
}
