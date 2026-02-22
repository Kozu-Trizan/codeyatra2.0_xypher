import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        pathname === to ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-brand flex items-center justify-center text-xs font-black text-white">
          A
        </div>
        <span className="font-bold text-text-primary tracking-tight">
          Aarvana
        </span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-6">
        {navLink("/pathfinder", "Learning Path")}
        {navLink("/diagnose", "Missions")}
        {navLink("/progress", "My Progress")}
        {navLink("/questions", "Explore")}

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-brand">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              0
            </div>
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-lg border border-gray-200 hover:border-amber-brand bg-white px-3 py-1.5 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-amber-brand flex items-center justify-center text-[10px] font-bold text-white">
                {initials}
              </div>
              <span className="text-sm text-text-secondary max-w-[100px] truncate">
                {user.name.split(" ")[0]}
              </span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg border border-gray-200 hover:border-gray-300 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-amber-brand hover:bg-amber-hover px-4 py-1.5 text-sm font-semibold text-white transition-colors"
            >
              Sign up free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
