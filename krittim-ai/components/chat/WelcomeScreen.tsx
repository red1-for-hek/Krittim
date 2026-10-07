'use client';

import { motion, type Variants } from 'framer-motion';
import { BrainCircuit, Code2, Sparkles, WandSparkles, type LucideIcon } from 'lucide-react';

import { MOCK_USER } from '@/lib/types';

/* ----------------------------- motion variants ---------------------------- */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } },
};

const wordReveal: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 220, damping: 24, mass: 0.7 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* --------------------------------- prompts -------------------------------- */

const SUGGESTIONS: { icon: LucideIcon; title: string; prompt: string }[] = [
  {
    icon: Code2,
    title: 'Debug a race condition',
    prompt: 'Review this async React effect for race conditions and stale closures.',
  },
  {
    icon: BrainCircuit,
    title: 'Explain like a paper',
    prompt: 'Explain retrieval-augmented generation like an arXiv abstract, then simplify it.',
  },
  {
    icon: Sparkles,
    title: 'Draft a launch announcement',
    prompt: 'Write a crisp launch announcement for Krittim AI v2 aimed at developers.',
  },
  {
    icon: WandSparkles,
    title: 'Brainstorm a hackathon theme',
    prompt: 'Pitch five original hackathon themes for a university IT club of 200 members.',
  },
];

/* ------------------------------ word-by-word ------------------------------ */

function RevealWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <motion.span variants={wordReveal} className="inline-block will-change-transform">
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------ welcome screen ---------------------------- */

/**
 * WelcomeScreen — the empty state.
 * Editorial serif-italic headline with a word-by-word blur reveal,
 * a soft greeting line, and four zero-effort starter prompts.
 */
export function WelcomeScreen({ onPrompt }: { onPrompt?: (prompt: string) => void }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex h-full w-full flex-col items-center justify-center px-6 pb-10"
    >
      {/* Brand sigil */}
      <motion.div
        variants={fadeUp}
        className="relative mb-8 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-soft shadow-[0_0_44px_-8px_oklch(0.72_0.17_278/80%)]"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand to-brand-soft opacity-40 blur-xl" />
        <svg viewBox="0 0 24 24" fill="none" className="relative size-7 text-white">
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.3" opacity="0.9" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.3" opacity="0.7" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.3" opacity="0.5" transform="rotate(120 12 12)" />
        </svg>
      </motion.div>

      {/* Headline — italic serif editorial moment */}
      <h1 className="text-center font-serif-display text-5xl leading-[1.08] tracking-tight md:text-6xl">
        <RevealWords text={`Welcome, ${MOCK_USER.name}.`} className="text-foreground/90" />
        <br />
        <RevealWords
          text="What should we create today?"
          className="text-aurora italic"
        />
      </h1>

      {/* Sub copy */}
      <motion.p
        variants={fadeUp}
        className="mt-5 max-w-md text-center text-sm leading-relaxed text-muted-foreground md:text-[15px]"
      >
        Krittim pairs fast recall with deep reasoning — ask, attach, or dictate,
        and get answers worth keeping.
      </motion.p>

      {/* Starter prompts */}
      <motion.div
        variants={fadeUp}
        className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
          <button
            key={title}
            type="button"
            onClick={() => onPrompt?.(prompt)}
            className="group flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-4 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:bg-surface-soft hover:shadow-[0_12px_36px_-14px_oklch(0.72_0.17_278/40%)] active:translate-y-0"
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-soft text-muted-foreground transition-colors duration-300 group-hover:border-brand/30 group-hover:text-brand">
              <Icon className="size-4" strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">{title}</span>
              <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
                {prompt}
              </span>
            </span>
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}
