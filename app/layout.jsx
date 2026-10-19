import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata = {
  title: "SpreadForge — Relative-Value Research",
  description:
    "A quantitative research terminal for comparing provisional MCX gold futures spreads.",
  generator: "SpreadForge",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport = {
  colorScheme: "dark light",
  themeColor: "#0d1114",
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
