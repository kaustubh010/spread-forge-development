"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { contracts } from "@/lib/mock-data";
import { useSimulation } from "@/lib/simulation-context";

export function TopNavbar() {
  const router = useRouter();
  const {
    sidebarOpen,
    setSidebarOpen,
    theme,
    toggleTheme,
    savedRuns,
    setCurrentRun,
    setProfileOpen,
  } = useSimulation();

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const contractMatches = contracts
      .filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q),
      )
      .map((c) => ({
        type: "contract",
        label: c.symbol,
        detail: c.name,
        href: "/contract-explorer",
      }));

    const runMatches = savedRuns
      .filter((r) => {
        const idMatch = r.id.toLowerCase().includes(q);
        const pairMatch =
          `${r.parameters?.contractA} ${r.parameters?.contractB}`
            .toLowerCase()
            .includes(q);
        return idMatch || pairMatch;
      })
      .map((r) => ({
        type: "run",
        run: r,
        label: r.id,
        detail: `${r.parameters?.contractA || "A"} / ${
          r.parameters?.contractB || "B"
        } (${r.tradeCount} trades)`,
        href: "/backtest-results",
      }));

    return [...contractMatches, ...runMatches].slice(0, 6);
  }, [search, savedRuns]);

  // Handle outside click to close search dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "SELECT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectResult = (result) => {
    if (result.run) {
      setCurrentRun(result.run);
    }
    router.push(result.href);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu icon-button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        >
          <Menu />
        </button>

        <div className="top-search" ref={searchRef}>
          <Search className="search-icon" />
          <input
            ref={inputRef}
            aria-label="Search contracts, runs, and reports"
            placeholder="Search contracts, runs, reports..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {search ? (
            <button
              className="search-clear"
              onClick={() => {
                setSearch("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X />
            </button>
          ) : (
            <kbd className="search-shortcut" title="Press / to search">
              /
            </kbd>
          )}

          {isOpen && search.trim() && (
            <div className="search-results">
              {searchResults.length > 0 ? (
                searchResults.map((r, i) => (
                  <button
                    key={`${r.label}-${i}`}
                    className="search-result-item"
                    onClick={() => handleSelectResult(r)}
                  >
                    <div className="result-header">
                      <strong>{r.label}</strong>
                      <span className="result-type">{r.type}</span>
                    </div>
                    <span className="result-detail">{r.detail}</span>
                  </button>
                ))
              ) : (
                <div className="search-empty">No matching records found</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="top-actions">
        <button
          className="icon-button theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          title={theme === "dark" ? "Light theme" : "Dark theme"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>

        <button
          className="avatar"
          aria-label="Open research analyst profile"
          title="Aarav Rao · Research Analyst"
          onClick={() => setProfileOpen(true)}
        >
          AR
        </button>
      </div>
    </header>
  );
}
