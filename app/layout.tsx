import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/auth/account-menu";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MyTripPlanner | Italy itinerary planner",
    template: "%s | MyTripPlanner",
  },
  description: "Browse a curated Italy catalog and build a practical, editable day-by-day itinerary.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="site-header">
          <Link className="brand" href="/">MyTripPlanner</Link>
          <nav aria-label="Primary navigation">
            <Link href="/">Places</Link>
            <Link href="/plan">Plan a trip</Link>
          </nav>
          <AccountMenu />
        </header>
        <main id="main-content">{children}</main>
        <footer className="site-footer">
          <p>Thoughtful routes, transparent estimates, and plans that remain yours.</p>
        </footer>
      </body>
    </html>
  );
}
