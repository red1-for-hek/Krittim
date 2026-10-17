'use client';

import { memo } from 'react';

const WORDS = ['Welcome', 'to'];
const DELAYS = ['0ms', '90ms', '190ms'];

/**
 * WelcomeScreen — CSS word-reveal hero. One static glow on desktop,
 * frozen wash on mobile. No JS animation lib.
 */
export function WelcomeScreen() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center px-4 text-center">
      {/* soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className="h-[220px] w-[320px] rounded-full opacity-20 blur-[90px] sm:h-[280px] sm:w-[520px] sm:opacity-25"
          style={{
            background:
              'conic-gradient(from 120deg, oklch(0.62 0.18 155 / 55%), oklch(0.7 0.14 175 / 35%), oklch(0.55 0.16 135 / 45%), oklch(0.62 0.18 155 / 55%))',
          }}
        />
      </div>

      {/* sigil */}
      <div
        className="anim-fade-up relative mb-5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-soft shadow-[0_0_40px_-8px_var(--brand)] ring-1 ring-white/15 sm:size-16"
        style={{ '--d': '0ms' } as React.CSSProperties}
      >
        <svg viewBox="0 0 24 24" fill="none" className="relative size-7 text-white sm:size-8" aria-hidden>
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.4" opacity="0.95" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.4" opacity="0.75" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.4" opacity="0.55" transform="rotate(120 12 12)" />
        </svg>
      </div>

      <h1 className="font-sans text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
        {WORDS.map((w, i) => (
          <span key={w} className="anim-word" style={{ '--d': DELAYS[i] } as React.CSSProperties}>
            {w}
            {'\u00A0'}
          </span>
        ))}
        <span
          className="anim-word bg-gradient-to-r from-brand via-brand-soft to-brand bg-clip-text text-transparent hero-sheen"
          style={{ '--d': DELAYS[2] } as React.CSSProperties}
        >
          Krittim
        </span>
      </h1>

      <p className="anim-fade-up mt-2 font-sans text-base text-muted-foreground sm:text-xl" style={{ '--d': '280ms' } as React.CSSProperties}>
        by <span className="font-serif-display italic text-foreground/80">BNMPC ITC</span>
      </p>

      <p
        className="anim-fade-up mt-3 max-w-md text-[13px] leading-relaxed text-muted-foreground/80 sm:max-w-lg sm:text-[15px]"
        style={{ '--d': '360ms' } as React.CSSProperties}
      >
        Refined intelligence for complex reasoning, system architectures, and engineering execution.
      </p>

      <Suggestions />
    </div>
  );
}

const SUGGESTIONS = [
  { title: 'Review my code', sub: 'Paste a snippet for line-by-line feedback' },
  { title: 'Explain RAG', sub: 'Retrieval-augmented generation in plain terms' },
  { title: 'Plan a build', sub: 'Turn an idea into a shippable spec' },
] as const;

const Suggestions = memo(function Suggestions() {
  return (
    <div className="mt-6 hidden w-full max-w-xl grid-cols-3 gap-2 sm:grid">
      {SUGGESTIONS.map((s, i) => (
        <div
          key={s.title}
          className="anim-fade-up rounded-xl border border-hairline bg-surface px-3 py-2.5 text-left"
          style={{ '--d': `${440 + i * 90}ms` } as React.CSSProperties}
        >
          <p className="truncate text-xs font-medium text-foreground">{s.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground/70">{s.sub}</p>
        </div>
      ))}
    </div>
  );
});
