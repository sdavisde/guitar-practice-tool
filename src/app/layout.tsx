import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Triad Paths",
  description: "Many ways to play any progression as triads on guitar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="nocturne" className={`${manrope.variable} ${jetbrainsMono.variable} scroll-smooth`}>
      <body>{children}</body>
    </html>
  );
}
