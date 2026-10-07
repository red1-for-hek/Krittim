'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Mic, Paperclip, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chatStore';

const MAX_ROWS = 8;
const LINE_HEIGHT = 24; // px — matches text-base leading-6

interface ChatInputProps {
  className?: string;
  autoFocus?: boolean;
}

/**
 * ChatInput — the composer.
 * Auto-resizing textarea, attachment chips, mic placeholder and a send
 * button that ignites (glows) the moment there is something to send.
 */
export function ChatInput({ className, autoFocus = false }: ChatInputProps) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isResponding = useChatStore((s) => s.isResponding);
  const stopResponse = useChatStore((s) => s.stopResponse);

  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [listening, setListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = value.trim().length > 0 && !isResponding;

  /* -------- auto-resize -------- */
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS * LINE_HEIGHT + 32)}px`;
    el.style.overflowY = el.scrollHeight > MAX_ROWS * LINE_HEIGHT + 32 ? 'auto' : 'hidden';
  }, []);

  useEffect(resize, [value, resize]);

  /* -------- submit -------- */
  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const prompt = value.trim();
    if (!prompt || isResponding) return;
    sendMessage(prompt);
    setValue('');
    setAttachments([]);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.focus();
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* -------- attachments -------- */
  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setAttachments((prev) => [...prev, ...files].slice(0, 4));
    e.target.value = '';
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div
        className={cn(
          'composer-glow group relative rounded-[22px] border border-white/[0.08] bg-[oklch(0.17_0.008_265/80%)] shadow-[0_8px_40px_-16px_oklch(0_0_0/70%)] backdrop-blur-xl transition-all duration-300',
          isResponding && 'border-brand/25',
        )}
      >
        {/* hairline sheen across the top edge */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* attachment chips */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 px-4 pt-4">
                {attachments.map((file, i) => (
                  <motion.span
                    key={`${file.name}-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] py-1.5 pl-2.5 pr-1.5 text-xs text-muted-foreground"
                  >
                    <Paperclip className="size-3 text-brand" strokeWidth={2} />
                    <span className="max-w-36 truncate font-medium text-foreground">{file.name}</span>
                    <span className="text-muted-foreground/60">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="grid size-4.5 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                    >
                      <X className="size-3" strokeWidth={2.2} />
                    </button>
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isResponding ? 'Krittim is thinking…' : 'Ask anything — attach context, or dictate with the mic'}
          rows={1}
          aria-label="Message Krittim AI"
          className="block max-h-56 w-full resize-none bg-transparent px-5 pb-2 pt-4 text-base leading-6 text-foreground caret-brand outline-none placeholder:text-muted-foreground/60"
          style={{ minHeight: 60 }}
        />

        {/* action row */}
        <div className="flex items-center gap-1 px-3 pb-3 pt-1">
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleFiles} />

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach files"
                  className="grid size-9 place-items-center rounded-xl text-muted-foreground outline-none transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-90"
                />
              }
            >
              <Paperclip className="relative size-4.5" strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg">Attach files</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setListening((l) => !l)}
                  aria-label={listening ? 'Stop dictation' : 'Dictate with voice'}
                  aria-pressed={listening}
                  className={cn(
                    'relative grid size-9 place-items-center rounded-xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-90',
                    listening
                      ? 'bg-brand/15 text-brand'
                      : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
                  )}
                />
              }
            >
              {listening && (
                <span className="absolute inset-0 animate-ping rounded-xl bg-brand/20 [animation-duration:1.6s]" />
              )}
              <Mic className={cn('relative size-4.5', listening && 'scale-110')} strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg">
              {listening ? 'Listening — tap to stop' : 'Dictate'}
            </TooltipContent>
          </Tooltip>

          {listening && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-2 flex items-end gap-[3px]"
              aria-hidden
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <motion.span
                  key={n}
                  className="w-[3px] rounded-full bg-brand/70"
                  animate={{ height: [6, 14, 8, 16, 6] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: n * 0.12, ease: 'easeInOut' }}
                />
              ))}
              <span className="ml-2 self-center text-xs text-muted-foreground">Listening…</span>
            </motion.span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden select-none items-center gap-1 text-[11px] text-muted-foreground/50 sm:flex">
              <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono">Shift</kbd>
              <span>+</span>
              <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono">Enter</kbd>
              <span>for newline</span>
            </span>

            {/* stop generation — appears while Krittim streams */}
            <AnimatePresence>
              {isResponding && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  onClick={stopResponse}
                  aria-label="Stop generating"
                  className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-foreground outline-none transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-90"
                >
                  <span className="size-3 rounded-[3px] bg-current" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* glowing send */}
            <motion.button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              whileTap={{ scale: 0.88 }}
              animate={canSend ? { scale: 1, opacity: 1 } : { scale: 0.96, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'send-glow grid size-10 place-items-center rounded-full transition-all duration-300',
                canSend
                  ? 'bg-gradient-to-br from-brand to-brand-soft text-white hover:brightness-110'
                  : 'cursor-not-allowed bg-white/[0.07] text-muted-foreground/50',
              )}
            >
              <ArrowUp className="size-4.5" strokeWidth={2.2} />
            </motion.button>
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground/50">
        Krittim can make mistakes. Verify important information.
        <span className="mx-1.5">·</span>
        <span className="font-serif-display italic text-muted-foreground/70">BNMPC IT Club</span>
      </p>
    </form>
  );
}
