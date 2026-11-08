import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/newsreader/500-italic.css";
import "@fontsource-variable/geist-mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://krittim-client.vercel.app"),
  title: {
    default: "Krittim AI — Reasoning, refined.",
    template: "%s · Krittim AI",
  },
  description:
    "Krittim AI is the premium conversational intelligence platform by BNMPC IT Club — fast answers, deep reasoning, live web research, and a beautifully crafted chat experience.",
  keywords: ["Krittim AI", "AI chat", "BNMPC IT Club", "LLM", "assistant", "reasoning", "web search AI"],
  authors: [{ name: "BNMPC IT Club" }],
  creator: "BNMPC IT Club",
  applicationName: "Krittim AI",
  openGraph: {
    type: "website",
    siteName: "Krittim AI",
    title: "Krittim AI — Reasoning, refined.",
    description:
      "Premium conversational intelligence by BNMPC IT Club — fast answers, deep reasoning, and grounded web research.",
    url: "https://krittim-client.vercel.app",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Krittim AI — Reasoning, refined.",
    description:
      "Premium conversational intelligence by BNMPC IT Club — fast answers, deep reasoning, and grounded web research.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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
const THEME_BOOTSTRAP = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('krittim-theme');var r=t?JSON.parse(t).resolved:null;if(!r){var s=localStorage.getItem('krittim-chat-store');var p=s?JSON.parse(s).state.theme:null;r=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):(p||'dark')}d.classList.toggle('dark',r!=='light');d.classList.toggle('light',r==='light');d.style.colorScheme=r}catch(e){document.documentElement.classList.add('dark')}})();`;

/**
 * RootLayout — Server Component
 * Owns metadata, the anti-flash theme script and the html/body shell only.
 * Fonts are self-hosted via @fontsource (imported above) so builds never depend
 * on an external Google Fonts fetch — faster, private, and offline-safe.
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
        suppressHydrationWarning
        className="min-h-dvh bg-background font-sans text-foreground antialiased"
      >
        {children}
      </body>
    </html>
  );
}
