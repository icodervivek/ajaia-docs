import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { User } from "../lib/types";

// Mock login: this take-home has no password/identity provider, so signing
// in means picking one of a few seeded demo accounts. Real auth would swap
// this screen out for a proper login form -- everything downstream (JWT,
// requireAuth middleware, per-user access checks) already works the same
// way it would with real auth.
export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ users: User[] }>("/api/users")
      .then((res) => setUsers(res.users))
      .catch((e) => setError(e.message));
  }, []);

  async function handleLogin(userId: string) {
    setPending(userId);
    setError(null);
    try {
      await loginAs(userId);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <div className="auth-hero-glow" aria-hidden="true" />
        <div className="auth-hero-content">
          <div className="brand-mark">
            <DocIcon />
            <span>Ajaia Docs</span>
          </div>

          <h1 className="auth-hero-title">
            Write, organize, and
            <br />
            share — together.
          </h1>
          <p className="auth-hero-subtitle">
            A focused document workspace with real-time formatting, file import, and
            granular sharing — built for teams who move fast.
          </p>

          <ul className="auth-feature-list">
            <li>
              <EditIcon />
              <div>
                <strong>Rich-text editing</strong>
                <span>Headings, lists, and formatting that just works</span>
              </div>
            </li>
            <li>
              <UploadIcon />
              <div>
                <strong>Import in one click</strong>
                <span>Bring in .txt and .md files as editable docs</span>
              </div>
            </li>
            <li>
              <ShareIcon />
              <div>
                <strong>Share with your team</strong>
                <span>Grant access instantly, revoke it just as fast</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="auth-hero-mockup" aria-hidden="true">
          <div className="mockup-card mockup-card--back" />
          <div className="mockup-card mockup-card--front">
            <div className="mockup-line mockup-line--title" />
            <div className="mockup-line" />
            <div className="mockup-line mockup-line--short" />
            <div className="mockup-chip" />
          </div>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel-inner">
          <div className="brand-mark brand-mark--compact">
            <DocIcon />
            <span>Ajaia Docs</span>
          </div>

          <div className="auth-panel-header">
            <h2>Welcome back</h2>
            <p className="muted">Select a demo account to continue.</p>
          </div>

          <span className="demo-pill">
            <span className="demo-pill-dot" />
            Demo mode — no password required
          </span>

          {error && <div className="error-banner">{error}</div>}

          {users.length === 0 && !error ? (
            <ul className="user-list" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="user-list-item user-list-item--skeleton">
                  <span className="avatar avatar--skeleton" />
                  <span className="user-list-text">
                    <span className="skeleton-line skeleton-line--name" />
                    <span className="skeleton-line skeleton-line--email" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="user-list">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    className="user-list-item"
                    onClick={() => handleLogin(u.id)}
                    disabled={pending !== null}
                  >
                    <span className="avatar" style={{ background: avatarGradient(u.name) }}>
                      {u.name.charAt(0)}
                    </span>
                    <span className="user-list-text">
                      <span className="user-name">{u.name}</span>
                      <span className="small">{u.email}</span>
                    </span>
                    {pending === u.id ? (
                      <span className="spinner" aria-label="Signing in" />
                    ) : (
                      <ArrowIcon />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="auth-footnote muted small">
            Documents, formatting, and sharing are fully persisted — pick any account to explore.
          </p>
        </div>
      </main>
    </div>
  );
}

// Deterministic-per-name gradient so each demo user gets a consistent,
// distinct avatar color without needing to store one server-side.
function avatarGradient(name: string): string {
  const palettes = [
    "linear-gradient(135deg, #6366f1, #8b5cf6)",
    "linear-gradient(135deg, #06b6d4, #3b82f6)",
    "linear-gradient(135deg, #f59e0b, #ef4444)",
    "linear-gradient(135deg, #10b981, #06b6d4)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5" />
      <path d="M15.4 6.5 8.6 10.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
