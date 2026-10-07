'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, FileText, ImageIcon, Mic, Paperclip, Square, X, Zap } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import { useSpeechToText } from '@/hooks/useSpeechToText';
import type { AttachmentMeta } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chatStore';

/* -------------------------------------------------------------------------- */
/*  ChatInput — the composer                                                   */
/*                                                                            */
/*  • Auto-resizing textarea (1 → 8 rows) with Enter-to-send / Shift+Enter NL. */
/*  • Attachments: paperclip opens a picker; premium animated chips w/ local   */
/*    image previews above the field. Nothing is uploaded — metadata only.     */
/*  • Dictation via the Web Speech API; mic pulses + live waveform while on.   */
/*  • Send ignites (brand glow) only when there is something to send;          */
/*    morphs into a red Stop pill that hard-cancels the mock stream.           */
/* -------------------------------------------------------------------------- */

const SPRING = { type: 'spring', stiffness: 420, damping: 32, mass: 0.85 } as const;
const MAX_ROWS = 8;
const LINE_HEIGHT = 24; // px — mirrors text-base leading-6 below

interface PendingFile {
  id: string;
  meta: AttachmentMeta;
  /** objectURL for images so the chip can show a real thumbnail */
  previewUrl?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

let fileCounter = 0;

export function ChatInput() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const [value, setValue] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ------------------------------ auto resize ----------------------------- */
  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, LINE_HEIGHT * MAX_ROWS + 2)}px`;
  }, []);

  useEffect(autosize, [value, autosize]);

  /* -------------------------------- speech -------------------------------- */
  const appendTranscript = useCallback((chunk: string) => {
    setValue((prev) => {
      const next = prev.trimEnd();
      return next ? `${next} ${chunk}` : chunk;
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const speech = useSpeechToText({ onTranscript: appendTranscript });

  /* ------------------------------- attachments ---------------------------- */
  const onPickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-picking the same file
    if (!picked.length) return;

    const next: PendingFile[] = picked.slice(0, 6).map((file) => {
      const isImage = file.type.startsWith('image/');
      return {
        id: `att_${Date.now().toString(36)}_${fileCounter++}`,
        meta: { name: file.name, size: file.size, type: file.type || 'application/octet-stream' },
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      };
    });
    setFiles((prev) => [...prev, ...next].slice(0, 6));
    textareaRef.current?.focus();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  // Revoke any live previews on unmount.
  useEffect(() => {
    return () => files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------- submit ------------------------------- */
  const canSend = (value.trim().length > 0 || files.length > 0) && !isStreaming;

  const submit = () => {
    const trimmed = value.trim();
    if (!canSend || (!trimmed && files.length === 0)) return;
    const metas: AttachmentMeta[] = files.map((f) => f.meta);
    sendMessage(trimmed || `Shared ${metas.length} file${metas.length === 1 ? '' : 's'}`, metas);
    setValue('');
    setFiles((prev) => {
      prev.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      return [];
    });
    requestAnimationFrame(autosize);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  /* --------------------------------- render ------------------------------- */
  const waveBars = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);

  return (
    <div className="px-3 pb-3 pt-1 md:px-6 md:pb-5">
      <div className="mx-auto w-full max-w-3xl">
        {/* ---- attachment chips ---- */}
        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.div
              key="chips"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 px-1 pb-2.5">
                <AnimatePresence initial={false}>
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 4 }}
                      transition={SPRING}
                      className="group/chip flex items-center gap-2 rounded-xl border border-hairline bg-surface-soft py-1.5 pl-1.5 pr-1 shadow-[0_6px_20px_-12px_black] backdrop-blur-sm"
                    >
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-hairline bg-surface">
                        {file.previewUrl ? (
                          <Image
                            src={file.previewUrl}
                            alt={file.meta.name}
                            width={36}
                            height={36}
                            unoptimized
                            className="size-full object-cover"
                          />
                        ) : file.meta.type.startsWith('text') || /\.(md|txt|json|tsx?|jsx?|py|csv)$/i.test(file.meta.name) ? (
                          <FileText className="size-4 text-brand" strokeWidth={1.8} />
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground" strokeWidth={1.8} />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="max-w-[160px] truncate text-xs font-medium text-foreground">
                          {file.meta.name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {formatBytes(file.meta.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove attachment ${file.meta.name}`}
                        onClick={() => removeFile(file.id)}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-red-500/15 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500/40 active:scale-90"
                      >
                        <X className="size-3.5" strokeWidth={2.2} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- composer frame ---- */}
        <div
          className={cn(
            'composer-glow relative rounded-2xl border border-hairline bg-popover/70 backdrop-blur-xl',
            'transition-shadow duration-300',
            isStreaming && 'border-brand/30',
          )}
        >
          {/* listening strip — live waveform + interim transcript */}
          <AnimatePresence>
            {speech.listening && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-hairline"
              >
                <div className="flex items-center gap-3 px-4 py-2">
                  <motion.span
                    className="size-2 rounded-full bg-red-500 shadow-[0_0_10px_oklch(0.62_0.21_25/90%)]"
                    animate={{ opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }}
                    transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="flex h-4 items-end gap-[2px]" aria-hidden>
                    {waveBars.map((i) => (
                      <motion.i
                        key={i}
                        className="w-[3px] rounded-full bg-brand/80"
                        animate={{ height: ['30%', `${20 + ((i * 37) % 80)}%`, '30%'] }}
                        transition={{
                          duration: 0.9 + (i % 5) * 0.12,
                          repeat: Infinity,
                          delay: i * 0.045,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-xs italic text-muted-foreground">
                    {speech.interimTranscript || 'Listening — speak naturally…'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-1.5 p-2 pl-3.5">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                speech.listening ? 'Dictating… just keep talking' : 'Ask Krittim anything — paste code, attach files…'
              }
              aria-label="Message Krittim AI"
              className={cn(
                'max-h-[192px] min-h-[24px] w-full resize-none bg-transparent text-base leading-6 text-foreground',
                'outline-none placeholder:text-muted-foreground/55 selection:bg-brand/25',
              )}
            />

            {/* right control cluster */}
            <div className="flex shrink-0 items-center gap-1 pb-0.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                onChange={onPickFiles}
                className="hidden"
                aria-hidden
                tabIndex={-1}
              />
              <IconButton label="Attach files" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="size-[17px]" strokeWidth={1.8} />
              </IconButton>

              <TooltipableButton
                label={
                  speech.supported
                    ? speech.listening
                      ? 'Stop dictation'
                      : 'Dictate a message'
                    : 'Dictation not supported in this browser'
                }
                onClick={() => {
                  if (!speech.supported) return;
                  speech.toggle();
                }}
                active={speech.listening}
                disabled={!speech.supported}
              >
                <Mic className="size-[17px]" strokeWidth={1.8} />
              </TooltipableButton>

              {/* send / stop */}
              <AnimatePresence mode="wait" initial={false}>
                {isStreaming ? (
                  <motion.button
                    key="stop"
                    type="button"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={SPRING}
                    onClick={stopStreaming}
                    aria-label="Stop generating"
                    className="group/stop flex h-9 items-center gap-1.5 rounded-xl bg-red-500/90 px-3 text-white shadow-[0_0_24px_-6px_oklch(0.62_0.21_25/85%)] outline-none transition-all hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-red-400/60 active:scale-95"
                  >
                    <Square className="size-3.5 fill-current" strokeWidth={2} />
                    <span className="text-sm font-medium">Stop</span>
                  </motion.button>
                ) : (
                  <motion.button
                    key="send"
                    type="button"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={SPRING}
                    onClick={submit}
                    disabled={!canSend}
                    aria-label="Send message"
                    className={cn(
                      'grid size-9 place-items-center rounded-xl outline-none transition-all duration-300 active:scale-90',
                      canSend
                        ? 'bg-gradient-to-br from-brand to-brand-soft text-white shadow-[0_0_28px_-6px_oklch(0.72_0.17_278/85%)] hover:shadow-[0_0_36px_-4px_oklch(0.72_0.17_278/95%)] focus-visible:ring-2 focus-visible:ring-brand/60'
                        : 'cursor-not-allowed bg-surface-hover text-muted-foreground/50',
                    )}
                  >
                    <Zap className={cn('size-[17px]', canSend ? 'translate-y-px' : '')} strokeWidth={2.1} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ---- helper line ---- */}
        <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <AudioLines className="size-3" strokeWidth={1.8} />
            Enter to send · Shift+Enter for a new line
          </span>
          <AnimatePresence>
            {speech.error && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-400/80"
              >
                {speech.error === 'unsupported' ? 'Voice input needs Chrome or Edge' : speech.error}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ small buttons ------------------------------ */

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-90"
    >
      {children}
    </button>
  );
}

/** Mic button with its own pulse ring while listening. */
function TooltipableButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative grid size-9 place-items-center rounded-xl outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-90',
        disabled && 'cursor-not-allowed opacity-40',
        active
          ? 'text-brand'
          : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
      )}
    >
      {active && (
        <motion.span
          className="absolute inset-0 rounded-xl border border-brand/40 bg-brand/10"
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          aria-hidden
        />
      )}
      <span className={cn('relative', active && 'text-brand')}>{children}</span>
    </button>
  );
}
