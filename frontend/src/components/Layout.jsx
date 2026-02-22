import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navLinks = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/resume/upload", label: "Resume", icon: "📄" },
  { to: "/interview/setup", label: "Interview", icon: "🎤" },
];

export default function Layout({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-brand-600">
            <span className="text-2xl">🎯</span> InterviewAI
          </Link>

          {isAuthenticated && (
            <nav className="flex items-center gap-1 text-sm">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-500 hover:text-brand-600 hover:bg-slate-50"
                    }`
                  }
                >
                  <span className="mr-1.5">{link.icon}</span>{link.label}
                </NavLink>
              ))}
              <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-3">
                <span className="text-slate-400 text-xs truncate max-w-[140px]">{user?.email}</span>
                <button onClick={handleLogout} className="text-red-400 hover:text-red-500 font-medium text-xs bg-red-50 px-2.5 py-1 rounded-lg transition-colors">
                  Logout
                </button>
              </div>
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
