import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Krittim AI — Reasoning, refined.",
  description:
    "Krittim AI is the premium conversational intelligence platform by BNMPC IT Club — fast answers, deep reasoning, and a beautifully crafted chat experience.",
  keywords: ["Krittim AI", "AI chat", "BNMPC IT Club", "LLM", "assistant"],
  authors: [{ name: "BNMPC IT Club" }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Pre-hydration theme bootstrap (runs before first paint → zero flash).
 * Reads the resolved value we mirror into `krittim-theme` whenever the store
 * syncs; falls back to the persisted preference, then OS setting, then dark.
 */
const THEME_BOOTSTRAP = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('krittim-theme');var r=t?JSON.parse(t).resolved:null;if(!r){var s=localStorage.getItem('krittim-chat-store');var p=s?JSON.parse(s).state.theme:null;r=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):(p||'dark')}d.classList.toggle('dark',r!=='light');d.style.colorScheme=r}catch(e){document.documentElement.classList.add('dark')}})();`;

/**
 * RootLayout — Server Component
 * Owns fonts, metadata, the anti-flash theme script and the html/body shell only.
 * All interactivity lives below in client components.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Blocking, inline, safe — Next allows string children for scripts like this. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
