import Link from "next/link";
import { Play, ShieldCheck } from "lucide-react";

export function EmptyRun() {
  return (
    <div className="empty-panel">
      <ShieldCheck className="empty-icon" />
      <h2>No completed run selected</h2>
      <p>
        Run a simulation in Strategy Lab to populate metrics, trades, equity,
        and validation evidence.
      </p>
      <Link href="/strategy-lab" className="button button-primary">
        <Play /> Open Strategy Lab
      </Link>
    </div>
  );
}
