import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "📊", label: "Dashboard" },
  { to: "/jobs", icon: "💼", label: "Jobs" },
  { to: "/resume/upload", icon: "📄", label: "Resume" },
  { to: "/interview/setup", icon: "🎤", label: "Interview" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-slate-200 flex flex-col z-40">
      {/* ── Logo ─────────────────────────────────────── */}
      <div className="px-5 h-16 flex items-center border-b border-slate-100">
        <Link to="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-slate-800">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white text-xs font-black">
            AI
          </div>
          InterviewAI
        </Link>
      </div>

      {/* ── Nav Links ────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-brand-50 text-brand-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* ── User section ─────────────────────────────── */}
      <div className="border-t border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-medium"
        >
          ← Sign Out
        </button>
      </div>
    </aside>
  );
}
