import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-brand-600">
            <span className="text-2xl">🎯</span> InterviewAI
          </Link>

          {isAuthenticated && (
            <nav className="flex items-center gap-6 text-sm">
              <Link to="/" className="text-slate-600 hover:text-brand-600 transition-colors">
                Dashboard
              </Link>
              <Link to="/resume/upload" className="text-slate-600 hover:text-brand-600 transition-colors">
                Upload Resume
              </Link>
              <span className="text-slate-400">{user?.email}</span>
              <button onClick={handleLogout} className="text-red-500 hover:text-red-600 font-medium">
                Logout
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        AI Interview Platform — Hackathon Project
      </footer>
    </div>
  );
}
