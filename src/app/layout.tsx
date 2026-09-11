import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triad Paths",
  description: "Many ways to play any progression as triads on guitar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--bg)] text-[var(--ink)] antialiased">{children}</body>
    </html>
  );
}
