'use client';

import {
  ArrowUp,
  AudioLines,
  Cpu,
  Check,
  ChevronDown,
  FileText,
  ImageIcon,
  Mic,
  Paperclip,
  Wand2,
  Square,
  X,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

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

/* Composer — attach + dictate + reasoning mode + send/stop.
   CSS-only transitions. No animation lib. */

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
  auto: Wand2,
  fast: Gauge,
  thinking: Cpu,
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
  const enterToSend = useChatStore((s) => s.enterToSend);

  const [value, setValue] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, LINE_HEIGHT * MAX_ROWS + 2)}px`;
  }, []);

  useEffect(autosize, [value, autosize]);

  const appendTranscript = useCallback((chunk: string) => {
    setValue((prev) => {
      const next = prev.trimEnd();
      return next ? `${next} ${chunk}` : chunk;
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const speech = useSpeechToText({ onTranscript: appendTranscript });

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
    if (!enterToSend) return;
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const activeMode = MODE_OPTIONS.find((m) => m.id === reasoningMode) ?? MODE_OPTIONS[0];
  const ActiveModeIcon = MODE_ICONS[activeMode.id];

  return (
    <div className={cn('w-full', centered ? 'px-2' : 'px-3 pb-3 pt-1 md:px-6 md:pb-5')}>
      <div className="mx-auto w-full max-w-3xl">
        {/* attachment chips */}
        {files.length > 0 && (
          <div className="anim-fade-in overflow-hidden pb-2">
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="anim-scale-in flex items-center gap-2 rounded-xl border border-hairline bg-surface-soft py-1.5 pl-1.5 pr-1"
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
                    ) : file.meta.type.startsWith('text') ||
                      /\.(md|txt|json|tsx?|jsx?|py|csv)$/i.test(file.meta.name) ? (
                      <FileText className="size-4 text-brand" strokeWidth={1.8} />
                    ) : (
                      <ImageIcon className="size-4 text-muted-foreground" strokeWidth={1.8} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="max-w-[160px] truncate text-xs font-medium text-foreground sm:max-w-[200px]">
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* composer frame */}
        <div
          className={cn(
            'composer-glow relative rounded-2xl border border-white/10 bg-popover/80 backdrop-blur-2xl',
            'transition-colors duration-200',
            isStreaming && 'border-brand/40',
            centered && 'border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/5',
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* listening strip */}
          {speech.listening && (
            <div className="anim-fade-in overflow-hidden border-b border-hairline">
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="pulse-dot size-2 rounded-full bg-red-500" />
                <span className="flex h-4 items-end gap-[2px]" aria-hidden>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <i
                      key={i}
                      className="wave-bar w-[3px] rounded-full bg-brand/80"
                      style={{
                        '--d': `${i * 0.1}s`,
                        height: `${25 + ((i * 10) % 60)}%`,
                      } as React.CSSProperties}
                    />
                  ))}
                </span>
                <p className="min-w-0 flex-1 truncate text-xs italic text-muted-foreground">
                  {speech.interimTranscript || 'Listening — speak clearly…'}
                </p>
              </div>
            </div>
          )}

          <div className="p-3 pb-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                speech.listening ? 'Dictating… say your thought' : 'Ask Krittim anything…'
              }
              aria-label="Message Krittim AI"
              className={cn(
                'max-h-[192px] min-h-[44px] w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed text-foreground sm:text-base',
                'outline-none placeholder:text-muted-foreground/45 selection:bg-brand/25',
              )}
            />
          </div>

          {/* toolbar: attach left, mode + send right */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pt-1">
            <div className="flex shrink-0 items-center gap-1.5">
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
                className="group flex min-h-[44px] items-center gap-1.5 rounded-xl border border-hairline bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:border-brand/30 hover:bg-surface-hover hover:text-foreground active:scale-95 sm:min-h-0"
              >
                <Paperclip className="size-3.5 text-muted-foreground transition-colors group-hover:text-brand" strokeWidth={2} />
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
                  'grid size-8 place-items-center rounded-xl border border-hairline outline-none transition-colors duration-150 active:scale-95 sm:size-8',
                  'min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0',
                  speech.listening
                    ? 'border-brand/40 bg-brand/15 text-brand'
                    : 'bg-surface text-muted-foreground hover:border-brand/30 hover:bg-surface-hover hover:text-foreground',
                  !speech.supported && 'cursor-not-allowed opacity-40',
                )}
              >
                <Mic className="size-3.5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu open={modeMenuOpen} onOpenChange={setModeMenuOpen}>
                <DropdownMenuTrigger
                  className="group flex min-h-[36px] items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:border-brand/35 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 data-popup-open:border-brand/50 data-popup-open:text-foreground"
                  aria-label={`Mode: ${activeMode.name}`}
                >
                  <ActiveModeIcon className="size-3.5 text-brand" strokeWidth={2} />
                  <span>{activeMode.name}</span>
                  <ChevronDown className="size-3 opacity-50 transition-transform duration-200 group-data-popup-open:rotate-180" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border-white/10 bg-popover/95 p-1.5 backdrop-blur-xl"
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
                        onClick={() => setReasoningMode(m.id)}
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

              {isStreaming ? (
                <button
                  key="stop"
                  type="button"
                  onClick={stopStreaming}
                  aria-label="Stop response"
                  className="anim-scale-in flex h-8 min-h-[44px] items-center gap-1.5 rounded-xl bg-red-500/90 px-3 text-xs font-semibold text-white outline-none transition-colors hover:bg-red-500 active:scale-95 sm:min-h-0"
                >
                  <Square className="size-3 fill-current" strokeWidth={2} />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  key="send"
                  type="button"
                  onClick={submit}
                  disabled={!canSend}
                  aria-label="Send prompt"
                  className={cn(
                    'anim-scale-in grid size-8 min-h-[44px] min-w-[44px] place-items-center rounded-xl outline-none transition-all duration-200 active:scale-90 sm:min-h-0 sm:min-w-0',
                    canSend
                      ? 'bg-gradient-to-br from-brand via-brand to-brand-soft text-white hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand/60'
                      : 'cursor-not-allowed bg-surface-hover text-muted-foreground/40',
                  )}
                >
                  <ArrowUp className="size-4" strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* helper line */}
        <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <AudioLines className="size-3" strokeWidth={1.8} />
            {enterToSend ? 'Enter to send · Shift+Enter for new line' : 'Tap send · Shift+Enter for new line'}
          </span>
          {speech.error && <span className="text-xs font-medium text-red-400">{speech.error}</span>}
        </div>
      </div>
    </div>
  );
}
