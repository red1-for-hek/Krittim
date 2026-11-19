'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  MonitorSmartphone,
  Brain,
  Radio,
  Keyboard,
  UserRound,
  Zap,
  Bell,
  Trash2,
  DatabaseZap,
  LogOut,
  ArrowLeft,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RESPONSE_STYLE_OPTIONS, type ResponseStyle } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

function SectionCard({
  children,
  danger = false,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-colors',
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
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-soft text-brand">
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
  value: 'dark' | 'light' | 'system';
  current: 'dark' | 'light' | 'system';
  onChange: (v: 'dark' | 'light' | 'system') => void;
  label: string;
  icon: LucideIcon;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => {
        onChange(value);
        toast.success(`${label} mode applied`, { duration: 1400 });
      }}
      aria-pressed={active}
      className={cn(
        'flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[0.97]',
        active
          ? 'border-brand/50 bg-brand/10 text-foreground'
          : 'border-hairline bg-surface text-muted-foreground hover:border-brand/30 hover:text-foreground',
      )}
    >
      {active && <span className="absolute -inset-px rounded-xl border border-brand/30 pointer-events-none" />}
      <Icon className={cn('relative size-5', active ? 'text-brand' : 'opacity-70')} strokeWidth={1.8} />
      <span className="relative">{label}</span>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const setPaletteOpen = useChatStore((s) => s.setPaletteOpen);

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
  const customInstructions = useChatStore((s) => s.customInstructions);
  const setCustomInstructions = useChatStore((s) => s.setCustomInstructions);
  const responseStyle = useChatStore((s) => s.responseStyle);
  const setResponseStyle = useChatStore((s) => s.setResponseStyle);
  const clearAllChats = useChatStore((s) => s.clearAllChats);
  const resetAllData = useChatStore((s) => s.resetAllData);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const flip = (v: boolean, fn: (on: boolean) => void, label: string) => {
    fn(v === true);
    toast.success(`${label} ${v ? 'on' : 'off'}`, { duration: 1400 });
  };

  useEffect(() => {
    setPaletteOpen(false);
  }, [setPaletteOpen]);

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <header className="glass-bar flex h-14 shrink-0 items-center gap-2 px-4 md:px-6 z-20">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <ArrowLeft className="size-5" strokeWidth={1.9} />
        </button>
        <div className="flex items-center gap-2">
          <SettingsIcon className="size-4 text-muted-foreground" strokeWidth={1.6} />
          <h1 className="text-sm font-semibold tracking-tight text-foreground">Settings</h1>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <div className="h-full overflow-y-auto p-6 md:p-8">
          {/* Appearance */}
          <SectionCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Appearance</h2>
            <div className="grid grid-cols-3 gap-2">
              <ThemeOption value="dark" current={theme} onChange={setTheme} label="Dark" icon={Moon} />
              <ThemeOption value="light" current={theme} onChange={setTheme} label="Light" icon={Sun} />
              <ThemeOption value="system" current={theme} onChange={setTheme} label="System" icon={MonitorSmartphone} />
            </div>
          </SectionCard>

          {/* Accent color */}
          <SectionCard>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-soft text-brand">
                  <Zap className="size-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Accent color</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Deep emerald glow used across buttons and active states.
                  </p>
                </div>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-soft text-sm font-bold text-white">
                K
              </div>
            </div>
          </SectionCard>

          {/* Timestamps */}
          <SectionCard>
            <SettingRow icon={Bell} title="Timestamps" description="Show message time under each bubble.">
              <Switch checked={showTimestamps} onCheckedChange={(v) => flip(v === true, setShowTimestamps, 'Timestamps')} aria-label="Show timestamps" />
            </SettingRow>
          </SectionCard>

          {/* Chat behavior */}
          <SectionCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Chat behavior</h2>
            <SettingRow icon={Brain} title="AI Memory" description="Remember preferences and context across conversations.">
              <Switch checked={aiMemory} onCheckedChange={(v) => flip(v === true, setAiMemory, 'AI memory')} aria-label="Enable AI memory" />
            </SettingRow>
            <SettingRow icon={Radio} title="Stream responses" description="Render tokens as they arrive. Turn off for full answers at once.">
              <Switch checked={streamResponses} onCheckedChange={(v) => flip(v === true, setStreamResponses, 'Streaming')} aria-label="Stream responses" />
            </SettingRow>
            <SettingRow icon={Keyboard} title="Enter to send" description="Enter sends, Shift+Enter adds a new line.">
              <Switch checked={enterToSend} onCheckedChange={(v) => flip(v === true, setEnterToSend, 'Enter to send')} aria-label="Enter to send" />
            </SettingRow>
          </SectionCard>

          {/* Personalize */}
          <SectionCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Personalize</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Custom instructions</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Standing directions Krittim follows in every chat — your role, tone, or rules.
                </p>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  maxLength={4000}
                  rows={4}
                  placeholder="e.g. I'm a backend engineer. Answer with TypeScript, be concise, and always mention trade-offs."
                  className="w-full resize-y rounded-xl border border-hairline bg-surface px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
                />
                <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground/60">{customInstructions.length}/4000</p>
              </div>
            </div>
          </SectionCard>

          {/* Response length */}
          <SectionCard>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Response length</p>
              <div className="grid grid-cols-3 gap-2">
                {RESPONSE_STYLE_OPTIONS.map((option) => {
                  const active = responseStyle === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setResponseStyle(option.id as ResponseStyle);
                        toast.success(`${option.name} responses`, { duration: 1200 });
                      }}
                      aria-pressed={active}
                      className={cn(
                        'flex flex-col items-center gap-0.5 rounded-xl border px-3 py-4 text-xs font-medium outline-none transition-colors active:scale-[0.97]',
                        active ? 'border-brand/50 bg-brand/10 text-foreground' : 'border-hairline bg-surface text-muted-foreground hover:border-brand/30 hover:text-foreground',
                      )}
                    >
                      <span>{option.name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground/70">{option.tagline}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          {/* Account */}
          <SectionCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Account</h2>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-soft text-sm font-semibold text-white">
                {user?.initials ?? '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{user?.name ?? 'Not signed in'}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email ?? 'Sign in to sync chats'}</p>
              </div>
            </div>

            <div className="mt-4">
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={() => { logout(); toast.success('Logged out'); }}>
                  <LogOut className="size-3.5" /> Log out
                </Button>
              ) : (
                <Button size="sm" onClick={() => router.push('/login')}>
                  Log in
                </Button>
              )}
            </div>
          </SectionCard>

          {/* Data / Danger zone */}
          <SectionCard danger>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-400/80">Data</h2>
            <SettingRow icon={Trash2} title="Clear all chats" description="Removes every message in this session. Cannot be undone.">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Clear all chats"
                onClick={() => {
                  if (confirmingClear) { clearAllChats(); setConfirmingClear(false); router.push('/'); }
                  else { setConfirmingClear(true); setTimeout(() => setConfirmingClear(false), 3000); }
                }}
                className={cn('h-9 gap-1.5 rounded-lg bg-red-500/15 text-xs font-semibold text-red-400 hover:bg-red-500/25 hover:text-red-300', confirmingClear && 'bg-red-500 text-white hover:bg-red-500 hover:text-white')}
              >
                <Trash2 className="size-3.5" strokeWidth={2.2} />
                {confirmingClear ? 'Tap again to confirm' : 'Clear chats'}
              </Button>
            </SettingRow>
            <SettingRow icon={DatabaseZap} title="Clear local storage" description="Wipes chats, messages and preferences from this browser.">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Clear local storage"
                onClick={() => {
                  if (confirmingReset) { resetAllData(); setConfirmingReset(false); router.push('/'); }
                  else { setConfirmingReset(true); setTimeout(() => setConfirmingReset(false), 3000); }
                }}
                className={cn('h-9 gap-1.5 rounded-lg bg-red-500/15 text-xs font-semibold text-red-400 hover:bg-red-500/25 hover:text-red-300', confirmingReset && 'bg-red-500 text-white hover:bg-red-500 hover:text-white')}
              >
                <Eraser className="size-3.5" />
                {confirmingReset ? 'Tap again to confirm' : 'Clear storage'}
              </Button>
            </SettingRow>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Eraser({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      <path d="M9 6V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}