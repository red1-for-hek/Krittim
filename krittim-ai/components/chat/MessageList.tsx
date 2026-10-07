'use client';

import { motion } from 'framer-motion';
import { Atom, Copy, Check, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';
import { MOCK_USER } from '@/lib/types';
import { useChatStore } from '@/store/chat-store';

/* ------------------------------ typing dots ------------------------------ */

function TypingIndicator() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Krittim is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-brand/80"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

/* -------------------------------- one bubble ------------------------------- */

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 26,
        delay: Math.min(index * 0.02, 0.2),
      }}
      className={cn('group flex w-full gap-3 md:gap-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="relative mt-0.5 hidden shrink-0 sm:block">
          <div className="absolute -inset-1 rounded-xl bg-brand/25 blur-md" />
          <Avatar className="relative size-8 border border-white/10">
            <AvatarFallback className="bg-gradient-to-br from-brand to-brand-soft text-white">
              <Atom className="size-4" strokeWidth={2} />
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className={cn('flex max-w-[85%] flex-col gap-1 md:max-w-[70%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm',
            isUser
              ? 'rounded-br-md border border-white/[0.09] bg-white/[0.07] text-foreground backdrop-blur-sm'
              : 'rounded-bl-md border border-white/[0.05] bg-[oklch(0.18_0.008_265/75%)] text-foreground/90 backdrop-blur-sm',
          )}
        >
          {message.pending ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* meta row */}
        {!isUser && !message.pending && (
          <div className="flex items-center gap-2 pl-1 text-[11px] text-muted-foreground/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
              {copied ? <Check className="size-3 text-emerald-400" strokeWidth={2.2} /> : <Copy className="size-3" strokeWidth={2} />}
            </button>
          </div>
        )}
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
  const scrollParentRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isResponding]);

  return (
    <div ref={scrollParentRef} className="flex flex-col gap-5 md:gap-6">
      {messages.map((m, i) => (
        <MessageBubble key={m.id} message={m} index={i} />
      ))}

      {/* live "thinking" bubble */}
      {isResponding && (
        <MessageBubble
          index={messages.length}
          message={{ id: 'pending', role: 'assistant', content: '', createdAt: Date.now(), pending: true }}
        />
      )}

      <div ref={bottomRef} className="h-px shrink-0" />
    </div>
  );
}
