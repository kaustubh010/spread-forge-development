"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useSimulation } from "@/lib/simulation-context";

export function ProfileModal() {
  const { profileOpen, setProfileOpen, savedRuns } = useSimulation();

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && profileOpen) {
        setProfileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [profileOpen, setProfileOpen]);

  if (!profileOpen) return null;

  return (
    <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
      <section
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Research analyst profile"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          onClick={() => setProfileOpen(false)}
          aria-label="Close profile"
        >
          <X />
        </button>
        <div className="avatar avatar-large">AR</div>
        <div className="eyebrow">RESEARCH ANALYST</div>
        <h2>Aarav Rao</h2>
        <p>SpreadForge demo workspace</p>
        <div className="profile-row">
          <span>Environment</span>
          <strong>Synthetic data</strong>
        </div>
        <div className="profile-row">
          <span>Saved runs</span>
          <strong>{savedRuns.length}</strong>
        </div>
        <button
          className="button button-outline"
          onClick={() => setProfileOpen(false)}
        >
          Close
        </button>
      </section>
    </div>
  );
}
