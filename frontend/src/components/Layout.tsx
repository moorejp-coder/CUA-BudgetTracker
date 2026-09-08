import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Receipt,
  LineChart,
  PiggyBank,
  Wallet,
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
  ArrowRight,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS: { to: string; label: string; end?: boolean; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutGrid },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/cashflow", label: "Cash Flow", icon: LineChart },
  { to: "/categories", label: "Categories & Budgets", icon: PiggyBank },
  { to: "/accounts", label: "Accounts", icon: Wallet },
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
        `group relative flex items-center gap-2.5 px-3 py-2 rounded-[0.7rem] text-sm font-medium transition-colors duration-150 ${
          isActive
            ? "bg-surface-raised text-ink shadow-[inset_3px_0_0_#cf8e27]"
            : "text-ink/55 hover:bg-surface-raised/60 hover:text-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
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
          <div className="brand-mark w-7 h-7 font-display italic font-semibold text-base">b</div>
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
          className="md:hidden fixed inset-0 z-20 bg-black/30 top-[57px] animate-fade-in"
          onClick={() => setNavOpen(false)}
        />
      )}

      <nav
        className={`w-60 shrink-0 border-r border-border-subtle p-4 flex flex-col fixed md:static inset-y-0 left-0 z-20 bg-canvas transition-transform duration-200 pt-[73px] md:pt-4 ${
          navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden md:flex items-center gap-2.5 px-2 py-3 mb-5">
          <div className="brand-mark w-8 h-8 font-display italic font-semibold text-lg">b</div>
          <span className="font-display italic text-lg text-ink">Budget Tracker</span>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto scrollbar-none">
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
        <div className="mt-4 rounded-[0.8rem] border border-border bg-[#fffdf9] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles size={16} className="text-accent" />
            Let AI help you save more
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/60">Get personalized tips based on your spending.</p>
          <NavLink to="/assistant" className="mt-4 flex items-center gap-2 text-sm font-semibold text-accent">
            Ask Assistant <ArrowRight size={14} />
          </NavLink>
        </div>
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <NavItemLink to="/settings" label="Settings" icon={Settings} />
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
