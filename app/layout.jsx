import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SimulationProvider } from "@/lib/simulation-context";
import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "SpreadForge — Relative-Value Research",
  description:
    "A quantitative research terminal for comparing provisional MCX gold futures spreads.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: "#0d1114",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SimulationProvider>
          <AppShell>{children}</AppShell>
        </SimulationProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
