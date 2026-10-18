import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFL WR Rankings",
  description: "Weekly and season WR scores, predictions and live leaders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
