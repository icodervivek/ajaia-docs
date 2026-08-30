import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import type { User } from "../lib/types";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, loginAs } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ users: User[] }>("/api/users").then((res) => setUsers(res.users)).catch(() => {});
  }, []);

  function handleSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id && id !== user?.id) loginAs(id);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/dashboard" className="brand">
          Ajaia Docs
        </Link>
        {user && (
          <div className="header-right">
            {/* Quick account switcher -- makes it easy to demo sharing between
                two accounts without opening a second browser profile. */}
            <select value={user.id} onChange={handleSwitch} aria-label="Switch demo user" className="user-switch">
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              className="btn-ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Log out
            </button>
          </div>
        )}
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
