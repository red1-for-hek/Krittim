'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, Check, ChevronDown, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MODEL_OPTIONS, type ModelId } from '@/lib/types';
import { useChatStore } from '@/store/chatStore';

const MODEL_ICONS: Record<ModelId, LucideIcon> = {
  auto: Sparkles,
  fast: Zap,
  thinking: BrainCircuit,
};

/**
 * ModelSwitcher — pill dropdown in the top bar.
 * Options: Krittim Auto (balanced) · Krittim Fast (lightning) · Krittim Thinking (brain).
 * Spring-animated checkmark on the active engine; glow ring while open.
 */
export function ModelSwitcher() {
  const model = useChatStore((s) => s.model);
  const setModel = useChatStore((s) => s.setModel);
  const [open, setOpen] = useState(false);
  const active = MODEL_OPTIONS.find((m) => m.id === model) ?? MODEL_OPTIONS[0];
  const ActiveIcon = MODEL_ICONS[active.id];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Model: ${active.name}`}
            className="group flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-all duration-200 hover:border-white/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 data-popup-open:border-brand/40 data-popup-open:text-foreground data-popup-open:shadow-[0_0_20px_-6px_oklch(0.72_0.17_278/60%)]"
          />
        }
      >
        <span className="text-brand">
          <ActiveIcon className="size-3.5" strokeWidth={1.9} />
        </span>
        <span className="hidden sm:inline">{active.name}</span>
        <span className="sm:hidden">{active.name.replace('Krittim ', '')}</span>
        <ChevronDown
          className="size-3 opacity-50 transition-transform duration-200 group-data-popup-open:rotate-180"
          strokeWidth={2.2}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 overflow-hidden rounded-2xl border-white/10 bg-popover/85 p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      >
        {/* spring entrance for the whole popup list */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={open ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Reasoning engine
          </div>

          {MODEL_OPTIONS.map((m) => {
            const Icon = MODEL_ICONS[m.id];
            const isActive = model === m.id;
            return (
              <DropdownMenuItem
                key={m.id}
                onSelect={() => setModel(m.id)}
                className="items-start gap-3 rounded-xl px-2.5 py-2.5"
              >
                <span
                  className={
                    'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border transition-colors ' +
                    (isActive
                      ? 'border-brand/30 bg-brand/15 text-brand'
                      : 'border-white/[0.06] bg-white/[0.04] text-muted-foreground')
                  }
                >
                  <Icon className="size-4" strokeWidth={1.9} />
                </span>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {m.name}
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-px text-[10px] font-normal text-muted-foreground">
                      {m.tagline}
                    </span>
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{m.description}</span>
                </div>

                {/* elegant spring-in checkmark */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="ml-auto mt-1 text-brand"
                    >
                      <Check className="size-4" strokeWidth={2.4} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </DropdownMenuItem>
            );
          })}

          <div className="mt-1 border-t border-white/[0.06] px-2.5 pb-1 pt-2 text-[11px] text-muted-foreground/50">
            Auto mode benchmarks every prompt before routing.
          </div>
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
