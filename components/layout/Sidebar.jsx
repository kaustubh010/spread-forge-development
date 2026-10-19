"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FlaskConical,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Vault as VaultIcon,
} from "lucide-react";
import { useSimulation } from "@/lib/simulation-context";

export const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Contract Explorer", href: "/contract-explorer", icon: Boxes },
  {
    label: "Strategy Lab",
    href: "/strategy-lab",
    icon: FlaskConical,
    match: ["/strategy-lab", "/HistoricalStrategyLab"],
  },
  { label: "Backtest Results", href: "/backtest-results", icon: BarChart3 },
  {
    label: "Evidence & Validation",
    href: "/evidence-and-validation",
    icon: ShieldCheck,
  },
  { label: "Research Vault", href: "/research-vault", icon: VaultIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useSimulation();

  const isItemActive = (item) => {
    if (item.href === "/") {
      return pathname === "/";
    }
    if (item.match) {
      return item.match.some((m) => pathname.startsWith(m));
    }
    return pathname.startsWith(item.href);
  };

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`mobile-backdrop ${sidebarOpen ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${sidebarOpen ? "" : "collapsed"} ${
          sidebarOpen ? "mobile-sidebar-open" : "mobile-sidebar-closed"
        }`}
        aria-label="Sidebar Navigation"
      >
        <Link href="/" className="brand" onClick={handleNavClick}>
          <div className="brand-mark">SF</div>
          {sidebarOpen && (
            <div className="brand-text">
              <strong>SpreadForge</strong>
              <small>QUANT RESEARCH</small>
            </div>
          )}
        </Link>

        <nav className="nav-container">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
                title={!sidebarOpen ? item.label : ""}
                onClick={handleNavClick}
              >
                <Icon className="nav-icon" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item collapse-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            {sidebarOpen && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
