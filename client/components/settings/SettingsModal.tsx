'use client';

import {
  Bell,
  Brain,
  DatabaseZap,
  Eraser,
  Keyboard,
  LogOut,
  MonitorSmartphone,
  Moon,
  Radio,
  Sun,
  Trash2,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

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
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

function SectionCard({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        danger
          ? 'border-red-500/20 bg-red-500/[0.04] hover:border-red-500/35'
          : 'border-hairline bg-surface hover:bg-surface-soft',
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
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-soft text-brand">
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
      onClick={() => {
        onChange(value);
        toast.success(`${label} mode on`, { duration: 1400 });
      }}
      aria-pressed={active}
      className={cn(
        'relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[0.97]',
        active
          ? 'border-brand/50 bg-brand/10 text-foreground'
          : 'border-hairline bg-surface text-muted-foreground hover:border-brand/30 hover:text-foreground',
      )}
    >
      {active && <span className="absolute inset-0 rounded-xl border border-brand/30" />}
      <Icon className={cn('relative size-5', active ? 'text-brand' : 'opacity-70')} strokeWidth={1.8} />
      <span className="relative">{label}</span>
    </button>
  );
}

export function SettingsModal() {
  const open = useChatStore((s) => s.settingsOpen);
  const setOpen = useChatStore((s) => s.setSettingsOpen);

  const theme = useChatStore((s) => s.theme);
  const setTheme = useChatStore((s) => s.setTheme);
  const aiMemory = useChatStore((s) => s.aiMemory);
  const setAiMemory = useChatStore((s) => s.setAiMemory);
  const streamResponses = useChatStore((s) => s.streamResponses);
  const setStreamResponses = useChatStore((s) => s.setStreamResponses);
  const enterToSend = useChatStore((s) => s.enterToSend);
  const setEnterToSend = useChatStore((s) => s.setEnterToSend);
  const showTimestamps = useChatStore((s) => s.showTimestamps);
  const setShowTimestamps = useChatStore((s) => s.setShowTimestamps);
  const clearAllChats = useChatStore((s) => s.clearAllChats);
  const resetAllData = useChatStore((s) => s.resetAllData);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setConfirmingClear(false);
      setConfirmingReset(false);
    }
  };

  const flip = (v: boolean, fn: (on: boolean) => void, label: string) => {
    fn(v);
    toast.success(`${label} ${v ? 'on' : 'off'}`, { duration: 1400 });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-panel max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border-white/10">
        <div className="anim-scale-in flex flex-col gap-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-sans text-xl font-semibold tracking-tight text-foreground">
              Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Appearance, chat behaviour, account and local data.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="appearance" className="gap-4">
            <TabsList className="w-full rounded-xl border border-hairline bg-surface-soft p-1">
              <TabsTrigger value="appearance" className="rounded-lg text-xs">Appearance</TabsTrigger>
              <TabsTrigger value="chat" className="rounded-lg text-xs">Chat</TabsTrigger>
              <TabsTrigger value="account" className="rounded-lg text-xs">Account</TabsTrigger>
              <TabsTrigger value="danger" className="rounded-lg text-xs text-red-400/80">Data</TabsTrigger>
            </TabsList>

            <TabsContent value="appearance">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2">
                  <ThemeOption value="dark" current={theme} onChange={setTheme} label="Dark" icon={Moon} />
                  <ThemeOption value="light" current={theme} onChange={setTheme} label="Light" icon={Sun} />
                  <ThemeOption value="system" current={theme} onChange={setTheme} label="System" icon={MonitorSmartphone} />
                </div>
                <SectionCard>
                  <SettingRow
                    icon={Zap}
                    title="Accent preview"
                    description="Deep emerald glow used across buttons and active states."
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-soft text-sm font-bold text-white">
                      K
                    </span>
                  </SettingRow>
                </SectionCard>
                <SectionCard>
                  <SettingRow icon={Bell} title="Timestamps" description="Show message time under each bubble.">
                    <Switch checked={showTimestamps} onCheckedChange={(v) => flip(v === true, setShowTimestamps, 'Timestamps')} aria-label="Show timestamps" />
                  </SettingRow>
                </SectionCard>
              </div>
            </TabsContent>

            <TabsContent value="chat">
              <div className="flex flex-col gap-3">
                <SectionCard>
                  <SettingRow icon={Brain} title="AI Memory" description="Remember preferences and context across conversations.">
                    <Switch checked={aiMemory} onCheckedChange={(v) => flip(v === true, setAiMemory, 'AI memory')} aria-label="Enable AI memory" />
                  </SettingRow>
                </SectionCard>
                <SectionCard>
                  <SettingRow icon={Radio} title="Stream responses" description="Render tokens as they arrive. Turn off for full answers at once.">
                    <Switch checked={streamResponses} onCheckedChange={(v) => flip(v === true, setStreamResponses, 'Streaming')} aria-label="Stream responses" />
                  </SettingRow>
                </SectionCard>
                <SectionCard>
                  <SettingRow icon={Keyboard} title="Enter to send" description="Enter sends, Shift+Enter adds a new line.">
                    <Switch checked={enterToSend} onCheckedChange={(v) => flip(v === true, setEnterToSend, 'Enter to send')} aria-label="Enter to send" />
                  </SettingRow>
                </SectionCard>
              </div>
            </TabsContent>

            <TabsContent value="account">
              <div className="flex flex-col gap-3">
                {isAuthenticated ? (
                  <SectionCard>
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-soft text-sm font-semibold text-white">
                        {user?.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { logout(); toast.success('Logged out'); }}>
                        <LogOut className="size-3.5" /> Log out
                      </Button>
                    </div>
                  </SectionCard>
                ) : (
                  <SectionCard>
                    <SettingRow icon={UserRound} title="Not signed in" description="Log in to sync chats across devices.">
                      <Button size="sm" onClick={() => { setOpen(false); openAuthModal('login'); }}>
                        Log in
                      </Button>
                    </SettingRow>
                  </SectionCard>
                )}
              </div>
            </TabsContent>

            <TabsContent value="danger">
              <div className="flex flex-col gap-3">
                <SectionCard danger>
                  <SettingRow icon={Trash2} title="Clear all chats" description="Removes every message in this session. Cannot be undone.">
                    <Button
                      variant="ghost" size="sm" aria-label="Clear all chats"
                      onClick={() => {
                        if (confirmingClear) { clearAllChats(); setConfirmingClear(false); handleOpenChange(false); }
                        else { setConfirmingClear(true); window.setTimeout(() => setConfirmingClear(false), 3000); }
                      }}
                      className={cn('h-8 gap-1.5 rounded-lg bg-red-500/15 text-xs font-semibold text-red-400 hover:bg-red-500/25 hover:text-red-300', confirmingClear && 'bg-red-500 text-white hover:bg-red-500 hover:text-white')}
                    >
                      <Trash2 className="size-3.5" strokeWidth={2.2} />
                      {confirmingClear ? 'Tap again to confirm' : 'Clear chats'}
                    </Button>
                  </SettingRow>
                </SectionCard>
                <SectionCard danger>
                  <SettingRow icon={DatabaseZap} title="Clear local storage" description="Wipes chats, messages and preferences from this browser.">
                    <Button
                      variant="ghost" size="sm" aria-label="Clear local storage"
                      onClick={() => {
                        if (confirmingReset) { resetAllData(); setConfirmingReset(false); handleOpenChange(false); }
                        else { setConfirmingReset(true); window.setTimeout(() => setConfirmingReset(false), 3000); }
                      }}
                      className={cn('h-8 gap-1.5 rounded-lg bg-red-500/15 text-xs font-semibold text-red-400 hover:bg-red-500/25 hover:text-red-300', confirmingReset && 'bg-red-500 text-white hover:bg-red-500 hover:text-white')}
                    >
                      <Eraser className="size-3.5" strokeWidth={2.2} />
                      {confirmingReset ? 'Tap again to confirm' : 'Clear storage'}
                    </Button>
                  </SettingRow>
                </SectionCard>
              </div>
            </TabsContent>
          </Tabs>

          <p className="border-t border-hairline pt-3 text-[11px] text-muted-foreground/50">
            Krittim AI · built by BNMPC IT Club
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
