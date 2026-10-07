'use client';

import { motion } from 'framer-motion';
import { Check, Copy, Sparkles } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';
import { MOCK_USER } from '@/lib/types';
import { useChatStore } from '@/store/chatStore';

/* ------------------------------ typing dots ------------------------------- */

function TypingDots({ label }: { label?: string }) {
  return (
    <span className="flex items-center gap-2 py-0.5" aria-label="Krittim is thinking">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-brand/80"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          />
        ))}
      </span>
      {label && <span className="text-xs text-muted-foreground/70">{label}</span>}
    </span>
  );
}

/* ------------------------------ code blocks ------------------------------- */

interface CodeBlockProps {
  language: string;
  value: string;
}

/** Dark, framed code card with a one-click copy affordance in the header. */
const CodeBlock = memo(function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div className="group/code my-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0c10] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]">
      {/* header rail */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-[#ff5f57]/70" />
            <span className="size-2 rounded-full bg-[#febc2e]/70" />
            <span className="size-2 rounded-full bg-[#28c840]/70" />
          </span>
          <span className="ml-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
            {language || 'text'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-all duration-200 hover:bg-white/[0.07] hover:text-foreground focus-visible:opacity-100 group-hover/code:opacity-100"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" strokeWidth={2.4} /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" strokeWidth={2} /> Copy
            </>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: 1.7,
        }}
        codeTagProps={{
          style: { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});
CodeBlock.displayName = 'CodeBlock';

/* --------------------------- markdown component map ------------------------ */

type CodeProps = {
  className?: string;
  children?: React.ReactNode;
};

const MARKDOWN_COMPONENTS: Components = {
  // Fenced + inline code both arrive here — route fenced ones to CodeBlock.
  code({ className, children }: CodeProps) {
    const text = String(children ?? '').replace(/\n$/, '');
    const match = /language-(\w+)/.exec(className ?? '');

    if (!match && !text.includes('\n')) {
      return (
        <code className="rounded-md border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-brand-soft">
          {text}
        </code>
      );
    }
    return <CodeBlock language={match?.[1] ?? 'text'} value={text} />;
  },
  // Neutralise the default <pre> wrapper so CodeBlock owns the frame.
  pre({ children }) {
    return <>{children}</>;
  },
  p({ children }) {
    return <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>;
  },
  ul({ children }) {
    return <ul className="my-2 list-disc space-y-1 pl-5 marker:text-brand/60">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-brand/60">{children}</ol>;
  },
  h1({ children }) {
    return <h1 className="mt-4 mb-2 text-lg font-semibold">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mt-4 mb-2 text-base font-semibold">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mt-3 mb-1.5 text-sm font-semibold">{children}</h3>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-3 border-l-2 border-brand/40 pl-3 text-muted-foreground italic">
        {children}
      </blockquote>
    );
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-brand-soft underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="my-4 border-white/[0.08]" />;
  },
  table({ children }) {
    return (
      <div className="my-4 w-full overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-white/[0.04] text-left">{children}</thead>;
  },
  th({ children }) {
    return <th className="px-3.5 py-2.5 font-semibold text-foreground/90">{children}</th>;
  },
  td({ children }) {
    return (
      <td className="border-t border-white/[0.06] px-3.5 py-2.5 text-muted-foreground">
        {children}
      </td>
    );
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
};

/* -------------------------------- one bubble ------------------------------- */

const BUBBLE_SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const time = useMemo(
    () => timeFormatter.format(new Date(message.createdAt)),
    [message.createdAt],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...BUBBLE_SPRING, delay: Math.min(index * 0.02, 0.2) }}
      className={cn('group flex w-full gap-3 md:gap-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* AI avatar — sleek gradient "K" */}
      {!isUser && (
        <div className="relative mt-0.5 hidden shrink-0 sm:block">
          <div className="absolute -inset-1 rounded-xl bg-brand/25 blur-md" />
          <Avatar className="relative size-8 border border-white/10">
            <AvatarFallback className="bg-gradient-to-br from-brand to-brand-soft font-serif-display text-sm italic text-white">
              K
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className={cn('flex max-w-[85%] flex-col gap-1 md:max-w-[78%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-[15px] shadow-sm',
            isUser
              ? 'rounded-br-md border border-white/[0.09] bg-white/[0.07] text-foreground backdrop-blur-sm'
              : 'rounded-bl-md border border-white/[0.05] bg-[oklch(0.18_0.008_265/75%)] text-foreground/90 backdrop-blur-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* meta row — appears on hover */}
        <div
          className={cn(
            'flex items-center gap-2 px-1 text-[11px] text-muted-foreground/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
            isUser && 'flex-row-reverse',
          )}
        >
          {isUser ? (
            <span>{time}</span>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-brand/70" strokeWidth={2} />
                Krittim
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy message"
                className="grid size-6 place-items-center rounded-md transition-colors hover:bg-white/[0.07] hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-3 text-emerald-400" strokeWidth={2.2} />
                ) : (
                  <Copy className="size-3" strokeWidth={2} />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* user avatar */}
      {isUser && (
        <Avatar className="mt-0.5 hidden size-8 shrink-0 border border-white/10 sm:block">
          <AvatarFallback className="bg-white/[0.08] text-xs font-semibold text-foreground/80">
            {MOCK_USER.initials}
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
}

/* ------------------------------- message list ------------------------------ */

export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const isResponding = useChatStore((s) => s.isResponding);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll pinned to the newest token. rAF batches it against paint so
     streaming stays smooth even at high tick rates. */
  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length, lastContent, isResponding]);

  const awaitingFirstToken = isResponding && messages[messages.length - 1]?.role !== 'assistant';

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {messages.map((m, i) => (
        <MessageBubble key={m.id} message={m} index={i} />
      ))}

      {/* pre-stream "thinking" bubble — shown during round-trip, before tokens land */}
      {awaitingFirstToken && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={BUBBLE_SPRING}
          className="flex items-center gap-3 sm:gap-4"
        >
          <div className="relative hidden shrink-0 sm:block">
            <div className="absolute -inset-1 animate-pulse rounded-xl bg-brand/30 blur-md" />
            <Avatar className="relative size-8 border border-white/10">
              <AvatarFallback className="bg-gradient-to-br from-brand to-brand-soft font-serif-display text-sm italic text-white">
                K
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="rounded-2xl rounded-bl-md border border-white/[0.05] bg-[oklch(0.18_0.008_265/75%)] px-4 py-3 backdrop-blur-sm">
            <TypingDots label="Thinking…" />
          </div>
        </motion.div>
      )}

      <div ref={bottomRef} className="h-px shrink-0" />
    </div>
  );
}
