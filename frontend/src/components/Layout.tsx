import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Receipt,
  LineChart,
  PiggyBank,
  Wallet,
  Target,
  Repeat,
  Sparkles,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  MessageCircleHeart,
  BookOpenText,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS: { to: string; label: string; end?: boolean; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutGrid },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/cashflow", label: "Cash Flow", icon: LineChart },
  { to: "/categories", label: "Categories & Budgets", icon: PiggyBank },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/recurring", label: "Recurring", icon: Repeat },
];

const AI_NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/assistant", label: "Assistant", icon: Sparkles },
  { to: "/forecasts", label: "Forecasts", icon: TrendingUp },
  { to: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { to: "/coach", label: "Coach", icon: MessageCircleHeart },
  { to: "/recaps", label: "Recaps", icon: BookOpenText },
];

function NavItemLink({ to, label, end, icon: Icon }: { to: string; label: string; end?: boolean; icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive ? "bg-surface-raised text-ink" : "text-ink/55 hover:bg-surface-raised/60 hover:text-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-accent transition-all duration-150 ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          />
          <Icon size={17} strokeWidth={2} className={isActive ? "text-accent" : "text-ink/40 group-hover:text-ink/70"} />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-canvas text-ink/90">
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-canvas/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center font-display italic font-semibold text-canvas text-base shadow-[0_0_0_1px_rgba(201,154,75,0.3),0_4px_12px_rgba(201,154,75,0.25)]">
            b
          </div>
          <span className="font-display italic text-[17px] text-ink">Budget Tracker</span>
        </div>
        <button
          onClick={() => setNavOpen((v) => !v)}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          className="btn-secondary px-2.5 py-1.5 text-sm"
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {navOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/60 top-[57px] animate-fade-in"
          onClick={() => setNavOpen(false)}
        />
      )}

      <nav
        className={`w-60 shrink-0 border-r border-border-subtle p-4 flex flex-col fixed md:static inset-y-0 left-0 z-20 bg-canvas transition-transform duration-200 pt-[73px] md:pt-4 ${
          navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden md:flex items-center gap-2.5 px-2 py-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display italic font-semibold text-canvas text-lg shadow-[0_0_0_1px_rgba(201,154,75,0.3),0_4px_14px_rgba(201,154,75,0.3)]">
            b
          </div>
          <span className="font-display italic text-lg text-ink">Budget Tracker</span>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavItemLink {...item} />
            </li>
          ))}
          <li className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/30">
            AI Insights
          </li>
          {AI_NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavItemLink {...item} />
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-ink/50 hover:text-expense hover:bg-expense-bg transition-colors duration-150"
          >
            <LogOut size={17} strokeWidth={2} />
            Log out
          </button>
        </div>
      </nav>
      <main className="flex-1 p-4 md:p-8 pt-[73px] md:pt-8 max-w-[1280px] min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
