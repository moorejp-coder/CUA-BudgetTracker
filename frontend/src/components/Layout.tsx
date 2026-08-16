import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transactions", label: "Transactions" },
  { to: "/cashflow", label: "Cash Flow" },
  { to: "/categories", label: "Categories & Budgets" },
  { to: "/accounts", label: "Accounts" },
  { to: "/goals", label: "Goals" },
  { to: "/recurring", label: "Recurring" },
];

const AI_NAV_ITEMS = [
  { to: "/assistant", label: "Assistant" },
  { to: "/forecasts", label: "Forecasts" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/anomalies", label: "Anomalies" },
  { to: "/coach", label: "Coach" },
  { to: "/recaps", label: "Recaps" },
];

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-canvas text-white/90">
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-canvas">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-sm font-bold">$</div>
          <span className="font-semibold text-white">Budget Tracker</span>
        </div>
        <button
          onClick={() => setNavOpen((v) => !v)}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          className="btn-secondary px-3 py-1.5 text-sm"
        >
          {navOpen ? "Close" : "Menu"}
        </button>
      </header>

      {navOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/60 top-[57px]"
          onClick={() => setNavOpen(false)}
        />
      )}

      <nav
        className={`w-60 shrink-0 border-r border-border-subtle p-4 flex flex-col fixed md:static inset-y-0 left-0 z-20 bg-canvas transition-transform duration-200 pt-[73px] md:pt-4 ${
          navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden md:flex items-center gap-2 px-2 py-3 mb-4">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-sm font-bold">$</div>
          <span className="font-semibold text-white">Budget Tracker</span>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? "bg-surface-raised text-white" : "text-white/60 hover:bg-surface-raised hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
          <li className="px-3 pt-4 pb-1.5 text-[11px] uppercase tracking-wide text-white/30">AI Insights</li>
          {AI_NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? "bg-surface-raised text-white" : "text-white/60 hover:bg-surface-raised hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button onClick={logout} className="btn-secondary text-sm mt-4">
          Log out
        </button>
      </nav>
      <main className="flex-1 p-4 md:p-8 pt-[73px] md:pt-8 max-w-[1280px] min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
