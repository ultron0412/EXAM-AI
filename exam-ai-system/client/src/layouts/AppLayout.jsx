import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? "bg-aqua-400/[0.15] text-aqua-200 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.25)]"
      : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
  }`;

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-sky-300/[0.15] bg-ink-950/[0.78] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/upload" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-aqua-300/60 bg-aqua-400/10 text-sm font-black text-aqua-200">
              EA
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-white">Exam AI</span>
              <span className="hidden text-xs text-slate-400 sm:block">
                Question prediction system
              </span>
            </span>
          </Link>
          <nav className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto">
            <NavLink to="/upload" className={navClass}>
              Upload
            </NavLink>
            <NavLink to="/dashboard" className={navClass}>
              Dashboard
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <p className="hidden max-w-48 truncate text-sm text-slate-400 md:block">{user?.email}</p>
            <button className="btn-secondary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};

export default AppLayout;
