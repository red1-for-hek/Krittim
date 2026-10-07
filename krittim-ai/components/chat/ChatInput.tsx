'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  AudioLines,
  BrainCircuit,
  Check,
  ChevronDown,
  FileText,
  ImageIcon,
  Mic,
  Paperclip,
  Sparkles,
  Square,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { MODE_OPTIONS, type AttachmentMeta, type ReasoningMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chatStore';

/* -------------------------------------------------------------------------- */
/*  ChatInput — World-class AI Composer                                       */
/*  • Left: File attachment picker + Voice dictation                          */
/*  • Right: Reasoning Mode switcher (Auto / Lightning / Thinking) + Send     */
/* -------------------------------------------------------------------------- */

const SPRING = { type: 'spring', stiffness: 420, damping: 32, mass: 0.85 } as const;
const MAX_ROWS = 8;
const LINE_HEIGHT = 24;

interface PendingFile {
  id: string;
  meta: AttachmentMeta;
  previewUrl?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MODE_ICONS: Record<ReasoningMode, LucideIcon> = {
  auto: Sparkles,
  fast: Zap,
  thinking: BrainCircuit,
};

let fileCounter = 0;

interface ChatInputProps {
  centered?: boolean;
}

export function ChatInput({ centered = false }: ChatInputProps) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const reasoningMode = useChatStore((s) => s.reasoningMode);
  const setReasoningMode = useChatStore((s) => s.setReasoningMode);

  const [value, setValue] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

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
    event.target.value = '';
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

  const activeMode = MODE_OPTIONS.find((m) => m.id === reasoningMode) ?? MODE_OPTIONS[0];
  const ActiveModeIcon = MODE_ICONS[activeMode.id];
  const waveBars = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);

  return (
    <div className={cn('w-full', centered ? 'px-2' : 'px-3 pb-3 pt-1 md:px-6 md:pb-5')}>
      <div className="mx-auto w-full max-w-3xl">
        {/* ---- attachment chips ---- */}
        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.div
              key="chips"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pb-2"
            >
              <div className="flex flex-wrap gap-2">
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
            'composer-glow relative rounded-2xl border border-white/10 bg-popover/80 backdrop-blur-2xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]',
            'transition-all duration-300',
            isStreaming && 'border-brand/40 shadow-[0_0_30px_-8px_oklch(0.72_0.17_278/40%)]',
            centered && 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-white/15 ring-1 ring-white/5',
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
                    {speech.interimTranscript || 'Listening — speak clearly…'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text Area */}
          <div className="p-3 pb-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                speech.listening ? 'Dictating… say your thought' : 'Ask Krittim anything, brainstorm, or paste context…'
              }
              aria-label="Message Krittim AI"
              className={cn(
                'max-h-[192px] min-h-[44px] w-full resize-none bg-transparent px-1 text-[15px] sm:text-base leading-relaxed text-foreground',
                'outline-none placeholder:text-muted-foreground/45 selection:bg-brand/25',
              )}
            />
          </div>

          {/* Bottom Toolbar: File upload on LEFT, Model mode + Send on RIGHT */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            {/* LEFT: File Upload & Voice */}
            <div className="flex items-center gap-1.5">
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach documents or images"
                title="Attach documents or images"
                className="group flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-all duration-200 hover:border-brand/30 hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                <Paperclip className="size-3.5 text-muted-foreground group-hover:text-brand transition-colors" strokeWidth={2} />
                <span className="hidden sm:inline">Attach</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!speech.supported) return;
                  speech.toggle();
                }}
                disabled={!speech.supported}
                aria-label={speech.listening ? 'Stop recording' : 'Dictate with voice'}
                title={speech.supported ? 'Dictate prompt' : 'Speech recognition not supported in this browser'}
                className={cn(
                  'grid size-8 place-items-center rounded-xl border border-hairline outline-none transition-all duration-200 active:scale-95',
                  speech.listening
                    ? 'border-brand/40 bg-brand/15 text-brand shadow-[0_0_14px_-2px_oklch(0.72_0.17_278/70%)]'
                    : 'bg-surface text-muted-foreground hover:border-brand/30 hover:bg-surface-hover hover:text-foreground',
                  !speech.supported && 'opacity-40 cursor-not-allowed',
                )}
              >
                <Mic className="size-3.5" strokeWidth={2} />
              </button>
            </div>

            {/* RIGHT: Mode Selector (Auto / Lightning / Thinking) + Send / Stop */}
            <div className="flex items-center gap-2">
              {/* Reasoning Mode Switcher */}
              <DropdownMenu open={modeMenuOpen} onOpenChange={setModeMenuOpen}>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`Mode: ${activeMode.name}`}
                      className="group flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-all duration-200 hover:border-brand/35 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 data-popup-open:border-brand/50 data-popup-open:text-foreground"
                    />
                  }
                >
                  <ActiveModeIcon className="size-3.5 text-brand" strokeWidth={2} />
                  <span>{activeMode.name}</span>
                  <ChevronDown className="size-3 opacity-50 transition-transform duration-200 group-data-popup-open:rotate-180" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border-white/10 bg-popover/90 p-1.5 backdrop-blur-2xl shadow-[0_16px_50px_-16px_rgba(0,0,0,0.85)]"
                >
                  <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Reasoning Mode
                  </div>
                  {MODE_OPTIONS.map((m) => {
                    const Icon = MODE_ICONS[m.id];
                    const isSelected = reasoningMode === m.id;
                    return (
                      <DropdownMenuItem
                        key={m.id}
                        onSelect={() => setReasoningMode(m.id)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs"
                      >
                        <Icon className={cn('size-3.5', isSelected ? 'text-brand' : 'text-muted-foreground')} strokeWidth={2} />
                        <div className="flex flex-col">
                          <span className={cn('font-medium', isSelected && 'text-brand')}>{m.name}</span>
                          <span className="text-[10px] text-muted-foreground/70">{m.tagline}</span>
                        </div>
                        {isSelected && <Check className="ml-auto size-3.5 text-brand" strokeWidth={2.4} />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send / Stop Action */}
              <AnimatePresence mode="wait" initial={false}>
                {isStreaming ? (
                  <motion.button
                    key="stop"
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={SPRING}
                    onClick={stopStreaming}
                    aria-label="Stop response"
                    className="flex h-8 items-center gap-1.5 rounded-xl bg-red-500/90 px-3 text-xs font-semibold text-white shadow-[0_0_20px_-4px_oklch(0.62_0.21_25/80%)] outline-none hover:bg-red-500 active:scale-95 transition-all"
                  >
                    <Square className="size-3 fill-current" strokeWidth={2} />
                    <span>Stop</span>
                  </motion.button>
                ) : (
                  <motion.button
                    key="send"
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={SPRING}
                    onClick={submit}
                    disabled={!canSend}
                    aria-label="Send prompt"
                    className={cn(
                      'grid size-8 place-items-center rounded-xl outline-none transition-all duration-300 active:scale-90',
                      canSend
                        ? 'bg-gradient-to-br from-brand via-brand to-brand-soft text-white shadow-[0_0_24px_-4px_oklch(0.72_0.17_278/90%)] hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand/60'
                        : 'cursor-not-allowed bg-surface-hover text-muted-foreground/40',
                    )}
                  >
                    <ArrowUp className="size-4" strokeWidth={2.4} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Helper Subtext */}
        <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <AudioLines className="size-3" strokeWidth={1.8} />
            Enter to send · Shift+Enter for new line
          </span>
          <AnimatePresence>
            {speech.error && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs font-medium"
              >
                {speech.error}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
