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
        pathname === to ? "text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black text-white">
          S
        </div>
        <span className="font-bold text-white tracking-tight">
          SikshyaMap
          <span className="text-indigo-400"> AI</span>
        </span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-6">
        {navLink("/", "Home")}
        {navLink("/questions", "Problems")}
        {navLink("/diagnose", "Diagnose")}
        {navLink("/pathfinder", "Pathfinder")}
        {navLink("/progress", "Progress")}

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800/60 px-3 py-1.5 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                {initials}
              </div>
              <span className="text-sm text-slate-300 max-w-[100px] truncate">
                {user.name.split(" ")[0]}
              </span>
            </Link>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors"
            >
              Sign up free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
