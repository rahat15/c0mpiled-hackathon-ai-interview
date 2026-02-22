import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

const PUBLIC_ROUTES = ["/", "/login", "/register"];

export default function Layout({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isPublic = PUBLIC_ROUTES.includes(location.pathname);

  // Public pages (landing, login, register) — no sidebar, full-width
  if (isPublic || !isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated pages — sidebar layout
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar />
      <div className="pl-60">
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
