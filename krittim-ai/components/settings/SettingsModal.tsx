'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  MonitorSmartphone,
  Moon,
  Radio,
  Sun,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ThemePreference } from '@/lib/types';
import { useChatStore } from '@/store/chatStore';

const SPRING = { type: 'spring', stiffness: 400, damping: 32 } as const;

/* ------------------------------- small parts ------------------------------- */

function SectionCard({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        danger
          ? 'border-red-500/20 bg-red-500/[0.04] hover:border-red-500/35'
          : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]',
      )}
    >
      {children}
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-brand">
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {children && <div className="shrink-0 pt-1">{children}</div>}
    </div>
  );
}

function ThemeOption({
  value,
  current,
  onChange,
  label,
  icon: Icon,
}: {
  value: ThemePreference;
  current: ThemePreference;
  onChange: (v: ThemePreference) => void;
  label: string;
  icon: LucideIcon;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={active}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-xs font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand/50',
        active
          ? 'border-brand/50 bg-brand/10 text-foreground shadow-[0_0_24px_-8px_oklch(0.72_0.17_278/50%)]'
          : 'border-white/[0.07] bg-white/[0.03] text-muted-foreground hover:border-white/15 hover:text-foreground',
      )}
    >
      {/* animated selection glow */}
      {active && (
        <motion.span layoutId="theme-pill" className="absolute inset-0 rounded-xl border border-brand/30" transition={SPRING} />
      )}
      <Icon className={cn('relative size-5', active ? 'text-brand' : 'opacity-70')} strokeWidth={1.8} />
      <span className="relative">{label}</span>
    </button>
  );
}

/* --------------------------------- modal ---------------------------------- */

/**
 * SettingsModal — glass dialog triggered from the sidebar.
 * Tabs: Appearance · AI Features · Danger Zone. Spring scale-in entrance.
 */
export function SettingsModal() {
  const open = useChatStore((s) => s.settingsOpen);
  const setOpen = useChatStore((s) => s.setSettingsOpen);

  const theme = useChatStore((s) => s.theme);
  const setTheme = useChatStore((s) => s.setTheme);
  const aiMemory = useChatStore((s) => s.aiMemory);
  const setAiMemory = useChatStore((s) => s.setAiMemory);
  const streamResponses = useChatStore((s) => s.streamResponses);
  const setStreamResponses = useChatStore((s) => s.setStreamResponses);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setConfirmingClear(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'glass-panel w-full max-w-lg overflow-hidden rounded-2xl border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] data-open:animate-none',
        )}
      >
        {/* entrance animation wrapper (Base UI owns open state; we spring-scale inner content) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={SPRING}
          className="flex flex-col gap-5"
        >
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-serif-display text-2xl italic tracking-tight text-aurora">
              Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tune Krittim to the way you think. Preferences are mocked for now.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="appearance" className="gap-4">
            <TabsList className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] p-1">
              <TabsTrigger value="appearance" className="rounded-lg text-xs">
                Appearance
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-lg text-xs">
                AI Features
              </TabsTrigger>
              <TabsTrigger value="danger" className="rounded-lg text-xs text-red-400/80 data-active:text-red-400">
                Danger Zone
              </TabsTrigger>
            </TabsList>

            {/* ------------------------- Appearance ------------------------- */}
            <TabsContent value="appearance">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-4"
              >
                <div className="grid grid-cols-3 gap-2">
                  <ThemeOption value="dark" current={theme} onChange={setTheme} label="Dark" icon={Moon} />
                  <ThemeOption value="light" current={theme} onChange={setTheme} label="Light" icon={Sun} />
                  <ThemeOption value="system" current={theme} onChange={setTheme} label="System" icon={MonitorSmartphone} />
                </div>
                <SectionCard>
                  <SettingRow
                    icon={Radio}
                    title="Interface density"
                    description="Comfortable spacing is tuned for long-form reasoning threads."
                  >
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
                      Comfortable
                    </span>
                  </SettingRow>
                </SectionCard>
              </motion.div>
            </TabsContent>

            {/* ------------------------- AI Features ------------------------ */}
            <TabsContent value="ai">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-3"
              >
                <SectionCard>
                  <SettingRow
                    icon={Brain}
                    title="Enable AI Memory"
                    description="Krittim recalls preferences and context across conversations — like a colleague who remembers last week's decisions."
                  >
                    <Switch
                      checked={aiMemory}
                      onCheckedChange={(checked) => setAiMemory(checked === true)}
                      aria-label="Enable AI memory"
                    />
                  </SettingRow>
                </SectionCard>

                <SectionCard>
                  <SettingRow
                    icon={Radio}
                    title="Stream Responses"
                    description="Render tokens as they arrive instead of waiting for the full answer. Feels instant at the cost of slightly higher bandwidth."
                  >
                    <Switch
                      checked={streamResponses}
                      onCheckedChange={(checked) => setStreamResponses(checked === true)}
                      aria-label="Stream responses"
                    />
                  </SettingRow>
                </SectionCard>
              </motion.div>
            </TabsContent>

            {/* -------------------------- Danger Zone ----------------------- */}
            <TabsContent value="danger">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <SectionCard danger>
                  <SettingRow
                    icon={Trash2}
                    title="Clear All Chats"
                    description="Permanently removes every message in this session from local state. This cannot be undone."
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Clear all chats"
                      onClick={() => {
                        if (confirmingClear) {
                          clearMessages();
                          setConfirmingClear(false);
                          handleOpenChange(false);
                        } else {
                          setConfirmingClear(true);
                          window.setTimeout(() => setConfirmingClear(false), 3000);
                        }
                      }}
                      className={cn(
                        'h-8 gap-1.5 rounded-lg bg-red-500/15 text-xs font-semibold text-red-400 shadow-none transition-all duration-200 hover:bg-red-500/25 hover:text-red-300',
                        confirmingClear && 'bg-red-500 text-white hover:bg-red-500 hover:text-white',
                      )}
                    >
                      <Trash2 className="size-3.5" strokeWidth={2.2} />
                      {confirmingClear ? 'Tap again to confirm' : 'Clear All Chats'}
                    </Button>
                  </SettingRow>
                </SectionCard>
              </motion.div>
            </TabsContent>
          </Tabs>

          <p className="border-t border-white/[0.06] pt-3 text-[11px] text-muted-foreground/50">
            Krittim AI · built by BNMPC IT Club
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
