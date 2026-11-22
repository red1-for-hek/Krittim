import type { Metadata, Viewport } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/500.css";
import "@fontsource/lora/600.css";
import "@fontsource/lora/400-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { ThemeSync } from "@/components/layout/ThemeSync";

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
    { media: "(prefers-color-scheme: dark)", color: "#09120e" },
    { media: "(prefers-color-scheme: light)", color: "#e8f3ec" },
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
 * Owns metadata, the anti-flash theme script, font imports, and ThemeSync.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-background font-sans text-foreground antialiased"
      >
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
