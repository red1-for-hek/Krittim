'use client';

import { motion, type Variants } from 'framer-motion';

/* ----------------------------- motion variants ---------------------------- */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 240, damping: 24, mass: 0.8 },
  },
};

/**
 * WelcomeScreen — centered hero presentation for empty chats.
 * Displays "Welcome to Krittim by BNMPC ITC" in stylized modern serif-italic typography.
 */
export function WelcomeScreen() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex w-full flex-col items-center justify-center text-center px-4"
    >
      {/* Brand Sigil */}
      <motion.div
        variants={fadeUp}
        className="relative mb-6 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-soft shadow-[0_0_50px_-8px_oklch(0.72_0.17_278/85%)] ring-1 ring-white/20"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand to-brand-soft opacity-40 blur-xl animate-pulse" />
        <svg viewBox="0 0 24 24" fill="none" className="relative size-8 text-white">
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.4" opacity="0.95" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.4" opacity="0.75" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.4" opacity="0.55" transform="rotate(120 12 12)" />
        </svg>
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        variants={fadeUp}
        className="font-serif-display text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-foreground leading-[1.12]"
      >
        <span>Welcome to </span>
        <span className="italic font-normal bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200 bg-clip-text text-transparent drop-shadow-sm px-1">
          Krittim
        </span>
        <span className="text-foreground/90 font-sans text-2xl sm:text-3xl md:text-4xl font-light tracking-normal block sm:inline sm:ml-2">
          by BNMPC ITC
        </span>
      </motion.h1>

      {/* Modern Tagline */}
      <motion.p
        variants={fadeUp}
        className="mt-3.5 max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground/80 font-normal"
      >
        Refined intelligence for complex reasoning, system architectures, and engineering execution.
      </motion.p>
    </motion.div>
  );
}
