"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { readStoredRuns, writeStoredRuns } from "./run-storage";
import { observations } from "./mock-data";
import { simulateRun } from "./simulation";

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const [currentRun, setCurrentRun] = useState(null);
  const [savedRuns, setSavedRuns] = useState([]);
  const [theme, setTheme] = useState("light");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Theme preference from localStorage or system
    const savedTheme = localStorage.getItem("spreadforge-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }

    // Load saved runs
    const stored = readStoredRuns(window.localStorage);
    if (stored && stored.length > 0) {
      setSavedRuns(stored);
      // Check for active run
      const activeId = localStorage.getItem("spreadforge-active-id");
      const active = stored.find((r) => r.id === activeId) || stored[0];
      setCurrentRun(active);
    } else {
      // Initialize with default demo run so UI has rich initial state
      try {
        const initial = simulateRun({
          contractA: "GOLDM",
          contractB: "GOLDTEN",
          observations,
          entryThreshold: 0.35,
          exitThreshold: 0.08,
          transactionCosts: 420,
          slippage: 0.04,
          lookback: 20,
        });
        const initialList = writeStoredRuns(window.localStorage, [initial]);
        setSavedRuns(initialList);
        setCurrentRun(initial);
        localStorage.setItem("spreadforge-active-id", initial.id);
      } catch (e) {
        console.error("Failed to seed initial demo run:", e);
      }
    }
  }, []);

  const saveRun = (run) => {
    setCurrentRun(run);
    if (typeof window !== "undefined") {
      localStorage.setItem("spreadforge-active-id", run.id);
      const nextRuns = [
        run,
        ...savedRuns.filter((item) => item.calculationKey !== run.calculationKey),
      ].slice(0, 20);
      const updated = writeStoredRuns(window.localStorage, nextRuns);
      setSavedRuns(updated);
    }
  };

  const selectRun = (run) => {
    setCurrentRun(run);
    if (typeof window !== "undefined") {
      localStorage.setItem("spreadforge-active-id", run.id);
    }
  };

  const deleteRun = (id) => {
    if (typeof window !== "undefined") {
      const nextRuns = savedRuns.filter((r) => r.id !== id);
      const updated = writeStoredRuns(window.localStorage, nextRuns);
      setSavedRuns(updated);
      if (currentRun?.id === id) {
        const nextActive = updated[0] || null;
        setCurrentRun(nextActive);
        if (nextActive) {
          localStorage.setItem("spreadforge-active-id", nextActive.id);
        } else {
          localStorage.removeItem("spreadforge-active-id");
        }
      }
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("spreadforge-theme", next);
    }
  };

  return (
    <SimulationContext.Provider
      value={{
        currentRun,
        setCurrentRun: selectRun,
        savedRuns,
        saveRun,
        deleteRun,
        theme,
        toggleTheme,
        sidebarOpen,
        setSidebarOpen,
        profileOpen,
        setProfileOpen,
        mounted,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
