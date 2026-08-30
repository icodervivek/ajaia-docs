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
    <div className="centered-page">
      <div className="login-card">
        <h1>Ajaia Docs</h1>
        <p className="muted">Pick a demo account to sign in. No password needed.</p>
        {error && <div className="error-banner">{error}</div>}
        <ul className="user-list">
          {users.map((u) => (
            <li key={u.id}>
              <button className="user-list-item" onClick={() => handleLogin(u.id)} disabled={pending !== null}>
                <span className="avatar">{u.name.charAt(0)}</span>
                <span>
                  <div className="user-name">{u.name}</div>
                  <div className="muted small">{u.email}</div>
                </span>
                {pending === u.id && <span className="muted small">Signing in…</span>}
              </button>
            </li>
          ))}
        </ul>
        {users.length === 0 && !error && <p className="muted">Loading demo users…</p>}
      </div>
    </div>
  );
}
