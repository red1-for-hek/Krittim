'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, Check, Copy, Sparkles, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { cn } from '@/lib/utils';
import type { ChatMessage, ModelId } from '@/lib/types';
import { selectActiveMessages, useChatStore } from '@/store/chatStore';

/* -------------------------------------------------------------------------- */
/*  MessageList — the thread canvas                                            */
/*                                                                            */
/*  • User turns: right-aligned frosted bubbles.                              */
/*  • AI turns: glowing "K" avatar + react-markdown (GFM tables, lists, code). */
/*  • Code blocks: dark framed card, language rail, hover copy button.        */
/*  • Entrance: staggered fade/slide springs; auto-scroll pinned to newest.   */
/* -------------------------------------------------------------------------- */

const SPRING = { type: 'spring', stiffness: 340, damping: 30, mass: 0.8 } as const;

const MODEL_ICONS: Record<ModelId, typeof Sparkles> = {
  r1_xenon: BrainCircuit,
  s1_neon: Zap,
};

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

/* ------------------------------- code block -------------------------------- */

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const match = /language-([\w-]+)/.exec(className ?? '');
  const language = match?.[1] ?? 'text';
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  // Inline code (single short line without fence language) renders as a chip.
  if (!match && code.length < 60 && !code.includes('\n')) {
    return (
      <code className="rounded-md border border-hairline bg-surface-hover px-1.5 py-0.5 font-mono text-[0.85em] text-brand-soft">
        {code}
      </code>
    );
  }

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl border border-hairline bg-[#0b0c10] shadow-[0_10px_40px_-18px_black]">
      {/* header rail */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3.5 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <i className="size-2.5 rounded-full bg-[#ff5f57]/80" />
          <i className="size-2.5 rounded-full bg-[#febc2e]/80" />
          <i className="size-2.5 rounded-full bg-[#28c840]/80" />
        </span>
        <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          {language}
        </span>
        <button
          type="button"
          aria-label="Copy code to clipboard"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              /* clipboard blocked — no-op */
            }
          }}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] outline-none transition-all duration-200',
            'focus-visible:ring-2 focus-visible:ring-brand/50',
            copied
              ? 'bg-emerald-500/15 text-emerald-400 opacity-100'
              : 'text-zinc-400 opacity-0 hover:bg-white/[0.06] hover:text-zinc-200 group-hover/code:opacity-100',
          )}
        >
          {copied ? (
            <>
              <Check className="size-3" strokeWidth={2.6} /> copied
            </>
          ) : (
            <>
              <Copy className="size-3" strokeWidth={1.9} /> copy
            </>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: '1rem 1.25rem',
          fontSize: '0.8125rem',
          lineHeight: 1.65,
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/* ------------------------------ markdown map ------------------------------- */

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="leading-relaxed [&:not(:first-child)]:mt-3">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-4 text-lg font-semibold tracking-tight first:mt-0">{children}</h2>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-4 text-base font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-3 text-sm font-semibold tracking-tight first:mt-0">{children}</h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 marker:text-brand/60">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 marker:font-mono marker:text-[11px] marker:text-brand/60">
      {children}
    </ol>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-brand-soft underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 border-l-2 border-brand/40 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-hairline" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b border-hairline bg-surface-soft px-3 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-b border-hairline/60 px-3 py-2 align-top last:border-b-0">{children}</td>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ className, children, ...rest }: any) => {
    const isBlock = String(children).includes('\n') || /language-/.test(className ?? '');
    if (isBlock) return <CodeBlock className={className}>{children}</CodeBlock>;
    return (
      <code className="rounded-md border border-hairline bg-surface-hover px-1.5 py-0.5 font-mono text-[0.85em] text-brand-soft" {...rest}>
        {children}
      </code>
    );
  },
};

/* --------------------------------- bubbles -------------------------------- */

function UserBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      className="group/msg flex flex-col items-end"
    >
      {message.attachments && message.attachments.length > 0 && (
        <div className="mb-1.5 flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {message.attachments.map((a) => (
            <span
              key={a.name}
              className="truncate rounded-lg border border-hairline bg-surface-soft px-2 py-1 font-mono text-[10px] text-muted-foreground"
            >
              📎 {a.name}
            </span>
          ))}
        </div>
      )}
      <div className="max-w-[85%] rounded-2xl rounded-br-md border border-white/[0.08] bg-white/[0.07] px-4 py-2.5 text-[15px] leading-relaxed text-foreground shadow-[0_8px_30px_-14px_black] backdrop-blur-md sm:max-w-[75%]">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      <div className="mt-1 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover/msg:opacity-100">
        <button
          type="button"
          aria-label="Copy message"
          onClick={async () => {
            await navigator.clipboard.writeText(message.content).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="grid size-6 place-items-center rounded-md text-muted-foreground/60 outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
        </button>
        <time className="font-mono text-[10px] text-muted-foreground/50">
          {timeFmt.format(message.createdAt)}
        </time>
      </div>
    </motion.div>
  );
}

function AssistantBubble({ message, streaming }: { message: ChatMessage; streaming: boolean }) {
  const activeModelId = message.model ?? 'r1_xenon';
  const Icon = MODEL_ICONS[activeModelId] ?? BrainCircuit;
  const modelName = activeModelId === 's1_neon' ? 'Krittim S1 Neon' : 'Krittim R1 Xenon';
  const [copied, setCopied] = useState(false);
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
      className="group/msg flex gap-3"
    >
      {/* K avatar */}
      <div className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand via-brand to-brand-soft shadow-[0_0_18px_-4px_oklch(0.72_0.17_278/70%)]">
        <span className="font-serif-display text-[15px] italic leading-none text-white">K</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <span className="font-medium text-foreground/90">{modelName}</span>
          {message.mode && (
            <span className="flex items-center gap-1 rounded-full border border-hairline bg-surface-soft px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-brand">
              <Icon className="size-2.5 text-brand" strokeWidth={2} /> {message.mode}
            </span>
          )}
        </div>

        <div className="prose-krittim max-w-none text-[15px] leading-relaxed text-foreground/90">
          {message.content === '' && streaming ? (
            <ThinkingDots />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          )}
          {streaming && message.content !== '' && (
            <span className="ml-0.5 inline-block h-[1.1em] w-[3px] translate-y-[2px] animate-pulse rounded-full bg-brand shadow-[0_0_8px_oklch(0.72_0.17_278/90%)]" />
          )}
        </div>

        {!streaming && message.content !== '' && (
          <div className="mt-1.5 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover/msg:opacity-100">
            <button
              type="button"
              aria-label="Copy response"
              onClick={async () => {
                await navigator.clipboard.writeText(message.content).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }}
              className="grid size-6 place-items-center rounded-md text-muted-foreground/60 outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            </button>
            <time className="font-mono text-[10px] text-muted-foreground/50">
              {timeFmt.format(message.createdAt)}
            </time>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 py-1" aria-label="Krittim is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-brand/80"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
        />
      ))}
      <span className="ml-1 text-xs italic text-muted-foreground/70">thinking…</span>
    </span>
  );
}

/* ------------------------------- skeleton ---------------------------------- */

/** Shimmer placeholder shown briefly while a chat thread switches in. */
export function ThreadSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8" aria-hidden>
      {[
        { selfEnd: false, lines: 3 },
        { selfEnd: true, lines: 1 },
        { selfEnd: false, lines: 4 },
      ].map((row, i) => (
        <div key={i} className={cn('flex gap-3', row.selfEnd && 'justify-end')}>
          {!row.selfEnd && (
            <div className="size-8 shrink-0 animate-pulse rounded-xl bg-surface-hover" />
          )}
          <div className={cn('space-y-2', row.selfEnd ? 'w-2/3' : 'w-4/5')}>
            {Array.from({ length: row.lines }).map((_, j) => (
              <div
                key={j}
                className="h-3 animate-pulse rounded-full bg-surface-hover"
                style={{ width: `${88 - j * 12}%`, animationDelay: `${(i + j) * 90}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- main list --------------------------------- */

/**
 * MessageList — reads the active thread from Zustand, animates every turn in,
 * and keeps the viewport pinned to the newest token while streaming.
 */
export function MessageList() {
  const messages = useChatStore(selectActiveMessages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const threadKey = useChatStore((s) => s.threadKey);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastIndex = messages.length - 1;

  // rAF-batched pin-to-bottom — cheap even at char-stream cadence (~55fps writes).
  useEffect(() => {
    let raf = 0;
    const pin = () => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    raf = requestAnimationFrame(pin);
    return () => cancelAnimationFrame(raf);
  }, [messages, threadKey]);

  const content = useMemo(
    () =>
      messages.map((m, i) => (
        <UserOrAssistant key={m.id} message={m} streaming={isStreaming && i === lastIndex} />
      )),
    [messages, isStreaming, lastIndex],
  );

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain scroll-smooth">
      <motion.div
        key={threadKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-6 md:px-6"
        role="log"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>{content}</AnimatePresence>
        <div ref={bottomRef} aria-hidden />
      </motion.div>
    </div>
  );
}

function UserOrAssistant({ message, streaming }: { message: ChatMessage; streaming: boolean }) {
  return message.role === 'user' ? (
    <UserBubble message={message} />
  ) : (
    <AssistantBubble message={message} streaming={streaming} />
  );
}
