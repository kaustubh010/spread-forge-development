"use client";

import { useSimulation } from "@/lib/simulation-context";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { ProfileModal } from "./ProfileModal";

export function AppShell({ children }) {
  const { theme } = useSimulation();

  return (
    <div className={theme === "dark" ? "app dark" : "app light"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar />
      <div className="main-shell">
        <TopNavbar />
        <main id="main" className="main-content">
          {children}
        </main>
      </div>
      <ProfileModal />
    </div>
  );
}
