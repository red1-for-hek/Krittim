'use client';

import {
  BookOpen,
  BrainCircuit,
  Check,
  Copy,
  ExternalLink,
  Gauge,
  Globe2,
  Cpu,
  FlaskConical,
  ImagePlus,
  Pencil,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wand2,
  X,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { cn } from '@/lib/utils';
import type { ChatMessage, ModelId, SearchStage } from '@/lib/types';
import { selectActiveMessages, useChatStore } from '@/store/chatStore';

/* Lightweight thread canvas — no animation lib, no Prism.
   Code = plain <pre> in mono. Assistant prose reads in a serif (Claude-style). */

const MODEL_ICONS: Record<ModelId, typeof FlaskConical> = {
  r1_xenon: FlaskConical,
  s1_neon: Gauge,
};

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

/** Detect an image result (markdown image, data URI, or image URL). */
function extractImage(content: string): string | null {
  const md = /!\[[^\]]*\]\(([^)]+)\)/.exec(content);
  if (md) return md[1];
  const trimmed = content.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|bmp)(\?\S*)?$/i.test(trimmed)) return trimmed;
  return null;
}

/* ------------------------- code block (no Prism) ------------------------- */

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const match = /language-([\w-]+)/.exec(className ?? '');
  const language = match?.[1] ?? 'text';
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  if (!match && code.length < 60 && !code.includes('\n')) {
    return (
      <code className="rounded-md border border-hairline bg-surface-hover px-1.5 py-0.5 font-mono text-[0.85em] text-brand-soft">
        {code}
      </code>
    );
  }

  return (
    <div className="group/code my-3 overflow-hidden rounded-xl border border-hairline bg-[#0b0c10]">
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
              /* clipboard blocked */
            }
          }}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] outline-none transition-colors duration-150',
            'focus-visible:ring-2 focus-visible:ring-brand/50',
            copied
              ? 'bg-emerald-500/15 text-emerald-400 opacity-100'
              : 'text-zinc-400 opacity-0 hover:bg-white/[0.06] hover:text-zinc-200 group-hover/code:opacity-100 focus-visible:opacity-100',
          )}
        >
          {copied ? (<><Check className="size-3" strokeWidth={2.6} /> copied</>) : (<><Copy className="size-3" strokeWidth={1.9} /> copy</>)}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="m-0 bg-transparent px-4 py-3.5 font-mono text-[13px] leading-[1.7] text-zinc-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

/* --------------------------- markdown map --------------------------- */

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
    <ol className="my-2 list-decimal space-y-1 pl-5 marker:font-mono marker:text-[11px] marker:text-brand/60">{children}</ol>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-brand-soft underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand">
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 border-l-2 border-brand/40 pl-4 italic text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-hairline" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b border-hairline bg-surface-soft px-3 py-2 text-left font-semibold">{children}</th>
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

/* --------------------------- live status pill --------------------------- */

const STAGE_META: Record<SearchStage, { icon: typeof Globe2; label: string }> = {
  searching: { icon: Globe2, label: 'Searching the web' },
  reading: { icon: BookOpen, label: 'Reading sources' },
  synthesizing: { icon: Sparkles, label: 'Synthesizing answer' },
  thinking: { icon: BrainCircuit, label: 'Thinking' },
  generating: { icon: Wand2, label: 'Generating image' },
};

function LiveStatus({ stage, detail }: { stage: SearchStage; detail?: string }) {
  const meta = STAGE_META[stage] ?? STAGE_META.thinking;
  const Icon = meta.icon;
  return (
    <div className="mb-2.5 inline-flex items-center gap-2.5 rounded-full border border-brand/20 bg-brand/[0.06] px-3 py-1.5">
      <span className="relative grid size-4 place-items-center">
        <span className="orb-dot absolute size-2 rounded-full bg-brand" />
        <Icon className="relative size-3.5 text-brand" strokeWidth={2} />
      </span>
      <span className="text-shimmer text-[13px] font-medium">{detail || meta.label}</span>
    </div>
  );
}

/* ------------------------------ bubbles ------------------------------ */

const UserBubble = memo(function UserBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const showTimestamps = useChatStore((s) => s.showTimestamps);
  const editAndResend = useChatStore((s) => s.editAndResend);

  const startEdit = () => { setDraft(message.content); setEditing(true); };
  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== message.content) editAndResend(message.id, next);
  };

  return (
    <div className="msg-enter group/msg flex flex-col items-end">
      {message.attachments && message.attachments.length > 0 && (
        <div className="mb-1.5 flex w-full max-w-[90%] flex-wrap justify-end gap-1.5">
          {message.attachments.map((a) => (
            <span key={a.name} className="truncate rounded-lg border border-hairline bg-surface-soft px-2 py-1 font-mono text-[10px] text-muted-foreground">
              📎 {a.name}
            </span>
          ))}
        </div>
      )}

      {editing ? (
        <div className="w-full max-w-[92%] sm:max-w-[80%]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(false);
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
            }}
            autoFocus
            rows={Math.min(8, draft.split('\n').length + 1)}
            className="w-full resize-none rounded-2xl rounded-br-md border border-brand/40 bg-white/[0.07] px-4 py-2.5 text-[15px] leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:text-base"
          />
          <div className="mt-1.5 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
              <X className="size-3" /> Cancel
            </button>
            <button type="button" onClick={commit} className="flex items-center gap-1 rounded-md bg-brand/15 px-2 py-1 text-[11px] font-medium text-brand hover:bg-brand/25">
              <RefreshCw className="size-3" /> Send again
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[92%] rounded-2xl rounded-br-md border border-white/[0.08] bg-white/[0.07] px-4 py-2.5 text-[15px] leading-relaxed text-foreground sm:max-w-[80%] sm:text-base md:max-w-[70%] lg:max-w-[65%]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      )}

      {!editing && (
        <div className="mt-1 flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            aria-label="Edit message"
            onClick={startEdit}
            className="grid size-6 place-items-center rounded-md text-muted-foreground/60 outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Pencil className="size-3" />
          </button>
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
          {showTimestamps && (
            <time className="font-mono text-[10px] text-muted-foreground/50">{timeFmt.format(message.createdAt)}</time>
          )}
        </div>
      )}
    </div>
  );
});

const AssistantBubble = memo(function AssistantBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
  const activeModelId = message.model ?? 's1_neon';
  const Icon = MODEL_ICONS[activeModelId] ?? Gauge;
  const modelName = activeModelId === 's1_neon' ? 'Krittim S1 Neon' : 'Krittim R1 Xenon';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(message.feedback ?? null);
  const showTimestamps = useChatStore((s) => s.showTimestamps);
  const onRegenerate = useChatStore((s) => s.regenerate);
  const image = extractImage(message.content);
  const showStatus = streaming && !!message.status;

  return (
    <div className="msg-enter group/msg flex w-full gap-3">
      <div className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand via-brand to-brand-soft">
        <span className="font-serif-display text-[15px] leading-none text-white" style={{ fontStyle: 'italic', fontWeight: 400 }}>K</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/70">
          <span className="truncate font-medium text-foreground/90">{modelName}</span>
          {message.mode && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-soft px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-brand">
              <Cpu className="size-2.5 text-brand" strokeWidth={2} /> {message.mode}
            </span>
          )}
        </div>

        <div className="font-reading max-w-none text-[16px] leading-[1.75] text-foreground/90 sm:text-[17px]">
          {showStatus && <LiveStatus stage={message.status!} detail={message.statusDetail} />}

          {image ? (
            <div className="my-1 overflow-hidden rounded-2xl border border-hairline bg-surface-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Generated" className="block w-full max-w-lg object-contain" loading="lazy" />
              <div className="flex items-center justify-between gap-2 border-t border-hairline px-3 py-2">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ImagePlus className="size-3.5 text-brand" /> Generated image
                </span>
                <a href={image} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 text-[11px] text-brand-soft hover:underline">
                  Open <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          ) : message.content === '' && streaming ? (
            !showStatus && <ThinkingDots />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {message.sources.map((source) => (
                <a
                  key={`${source.index}-${source.url}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-hairline bg-surface-soft px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
                >
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand/15 font-mono text-[9px] font-semibold text-brand">{source.index}</span>
                  <span className="truncate">{source.title}</span>
                </a>
              ))}
            </div>
          )}

          {streaming && message.content !== '' && !image && (
            <span className="stream-caret ml-0.5 inline-block h-[1.1em] w-[3px] translate-y-[2px] rounded-full bg-brand" />
          )}
        </div>

        {!streaming && message.content !== '' && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 focus-within:opacity-100">
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
            <button
              type="button"
              aria-label="Regenerate response"
              onClick={() => onRegenerate()}
              className="grid size-6 place-items-center rounded-md text-muted-foreground/60 outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <RefreshCw className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Good response"
              aria-pressed={feedback === 'up'}
              onClick={() => setFeedback((f) => (f === 'up' ? null : 'up'))}
              className={cn('grid size-6 place-items-center rounded-md outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/40', feedback === 'up' ? 'text-brand' : 'text-muted-foreground/60')}
            >
              <ThumbsUp className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Bad response"
              aria-pressed={feedback === 'down'}
              onClick={() => setFeedback((f) => (f === 'down' ? null : 'down'))}
              className={cn('grid size-6 place-items-center rounded-md outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/40', feedback === 'down' ? 'text-red-400' : 'text-muted-foreground/60')}
            >
              <ThumbsDown className="size-3" />
            </button>
            {showTimestamps && (
              <time className="ml-1 font-mono text-[10px] text-muted-foreground/50">{timeFmt.format(message.createdAt)}</time>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 py-1" aria-label="Krittim is thinking">
      <span className="flex gap-1">
        <span className="thinking-dot size-1.5 rounded-full bg-brand/80" style={{ '--d': '0ms' } as React.CSSProperties} />
        <span className="thinking-dot size-1.5 rounded-full bg-brand/80" style={{ '--d': '150ms' } as React.CSSProperties} />
        <span className="thinking-dot size-1.5 rounded-full bg-brand/80" style={{ '--d': '300ms' } as React.CSSProperties} />
      </span>
      <span className="ml-1 text-xs italic text-muted-foreground/70">thinking…</span>
    </span>
  );
}

/* ----------------------------- skeleton ----------------------------- */

export function ThreadSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8" aria-hidden>
      {[
        { selfEnd: false, lines: 3 },
        { selfEnd: true, lines: 1 },
        { selfEnd: false, lines: 4 },
      ].map((row, i) => (
        <div key={i} className={cn('flex gap-3', row.selfEnd && 'justify-end')}>
          {!row.selfEnd && <div className="skeleton-shimmer size-8 shrink-0 rounded-xl" />}
          <div className={cn('space-y-2', row.selfEnd ? 'w-2/3' : 'w-4/5')}>
            {Array.from({ length: row.lines }).map((_, j) => (
              <div key={j} className="skeleton-shimmer h-3 rounded-full" style={{ width: `${88 - j * 12}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ main list ------------------------------ */

export function MessageList() {
  const messages = useChatStore(selectActiveMessages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const threadKey = useChatStore((s) => s.threadKey);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIndex = messages.length - 1;

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
      messages.map((m, i) =>
        m.role === 'user' ? (
          <UserBubble key={m.id} message={m} />
        ) : (
          <AssistantBubble key={m.id} message={m} streaming={isStreaming && i === lastIndex} />
        ),
      ),
    [messages, isStreaming, lastIndex],
  );

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
      <div
        key={threadKey}
        className="anim-fade-in mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10 pt-6 md:px-6"
        role="log"
        aria-live="polite"
      >
        {content}
      </div>
    </div>
  );
}
