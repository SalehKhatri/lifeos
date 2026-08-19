import type { Metadata } from "next";
import { Geist, Geist_Mono, Chakra_Petch, Orbitron } from "next/font/google";
import "./globals.css";
import { AppQueryProvider } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";

// Body text — dense UI reading, needs max legibility (see frontend/DESIGN.md).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Data-like elements — timestamps, durations, scores, IDs.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headings + small uppercase tracked labels — the "voice" of the interface.
const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Wordmark only ("LIFEOS") — too wide/blocky for anything smaller.
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "A personal productivity system that answers \"what should I work on right now?\"",
};

// Dark-only for v1 (see frontend/DESIGN.md) — no light/dark toggle, hardcoded here.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} ${orbitron.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppQueryProvider>{children}</AppQueryProvider>
        {/* theme="dark" explicit — no next-themes ThemeProvider wired up since
            there's no light/dark toggle to drive it (see frontend/DESIGN.md). */}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
