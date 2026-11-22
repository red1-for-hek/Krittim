'use client';

import {
  ArrowLeft,
  Bell,
  Brain,
  DatabaseZap,
  Eraser,
  FlaskConical,
  Keyboard,
  LogOut,
  MonitorSmartphone,
  Moon,
  Palette,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Radio,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import AnimatedMeshBackground from '@/components/layout/AnimatedMeshBackground';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { RESPONSE_STYLE_OPTIONS, type ResponseStyle, type ThemePreference } from '@/lib/types';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

type SettingsSectionId = 'appearance' | 'chat' | 'personalize' | 'account' | 'data';

const NAV_ITEMS: Array<{ id: SettingsSectionId; label: string; icon: LucideIcon; description: string }> = [
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme, canvas & timestamps' },
  { id: 'chat', label: 'Chat Behavior', icon: SlidersHorizontal, description: 'Memory, streaming & keys' },
  { id: 'personalize', label: 'Personalize', icon: Sparkles, description: 'Instructions & response depth' },
  { id: 'account', label: 'Account', icon: UserRound, description: 'Session & profile details' },
  { id: 'data', label: 'Data & Storage', icon: DatabaseZap, description: 'Local chats & reset' },
];

function SectionCard({
  children,
  danger = false,
  className,
}: {
  children: ReactNode;
  danger?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'glass-panel rounded-2xl p-5 md:p-6 transition-colors',
        danger
          ? 'border-destructive/30 bg-destructive/[0.06]'
          : 'border-hairline',
        className,
      )}
    >
      {children}
    </section>
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
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 gap-3.5">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-soft text-brand">
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

function ThemeCard({
  value,
  current,
  onChange,
  label,
  subtitle,
  icon: Icon,
  swatchClass,
}: {
  value: ThemePreference;
  current: ThemePreference;
  onChange: (v: ThemePreference) => void;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  swatchClass: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => {
        onChange(value);
        toast.success(`${label} theme applied`, { duration: 1400 });
      }}
      aria-pressed={active}
      className={cn(
        'group relative flex flex-col items-start gap-3 rounded-xl border p-3.5 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[0.98]',
        active
          ? 'border-brand/55 bg-brand/[0.11] text-foreground shadow-sm'
          : 'border-hairline bg-surface-soft text-muted-foreground hover:border-brand/30 hover:bg-surface-hover hover:text-foreground',
      )}
    >
      <div className={cn('h-11 w-full rounded-lg border border-hairline/80 p-2 flex items-end justify-between', swatchClass)}>
        <span className="h-1.5 w-8 rounded-full bg-emerald-500/75" />
        <Icon className={cn('size-4', active ? 'text-brand' : 'opacity-75')} strokeWidth={1.9} />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
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

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const flip = (v: boolean, fn: (on: boolean) => void, label: string) => {
    fn(v);
    toast.success(`${label} ${v ? 'enabled' : 'disabled'}`, { duration: 1400 });
  };

  useEffect(() => {
    setPaletteOpen(false);
  }, [setPaletteOpen]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <AnimatedMeshBackground />

      <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/')}
            aria-label="Back to chat"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <ArrowLeft className="size-5" strokeWidth={1.9} />
          </button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="size-4 text-brand" strokeWidth={1.8} />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Settings</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/testmodel')}
            className="whitespace-nowrap rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            <FlaskConical className="size-3.5 text-brand" />
            Model Diagnostics
          </Button>
          {isAuthenticated && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/profile')}
              className="whitespace-nowrap rounded-xl border-hairline bg-surface text-xs"
            >
              <UserRound className="size-3.5" />
              Profile
            </Button>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-8 md:py-10">
        {/* Category Rail */}
        <nav aria-label="Settings sections" className="w-full shrink-0 md:w-60">
          <div className="mb-3 hidden md:block px-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Preferences</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Customize your workspace, model defaults, and privacy.
            </p>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                    active
                      ? 'border-brand/35 bg-brand/[0.10] text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-surface-soft hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground')} strokeWidth={1.9} />
                  <div className="min-w-0">
                    <div className="whitespace-nowrap text-sm font-medium">{item.label}</div>
                    <div className="hidden text-[11px] text-muted-foreground/75 md:block">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Settings Content Column */}
        <div className="min-w-0 flex-1 space-y-5">
          {activeSection === 'appearance' && (
            <div className="anim-fade-in space-y-5">
              <SectionCard>
                <div className="mb-4">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Theme</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Choose between the deep emerald dark canvas, mineral sage light canvas, or system sync.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ThemeCard
                    value="dark"
                    current={theme}
                    onChange={setTheme}
                    label="Dark"
                    subtitle="Deep emerald obsidian"
                    icon={Moon}
                    swatchClass="bg-[#0b1813]"
                  />
                  <ThemeCard
                    value="light"
                    current={theme}
                    onChange={setTheme}
                    label="Light"
                    subtitle="Mineral sage glass"
                    icon={Sun}
                    swatchClass="bg-[#dfeee5]"
                  />
                  <ThemeCard
                    value="system"
                    current={theme}
                    onChange={setTheme}
                    label="System"
                    subtitle="Match OS setting"
                    icon={MonitorSmartphone}
                    swatchClass="bg-gradient-to-r from-[#0b1813] via-[#1b3a2e] to-[#dfeee5]"
                  />
                </div>
              </SectionCard>

              <SectionCard>
                <SettingRow
                  icon={Bell}
                  title="Message timestamps"
                  description="Display message creation time underneath user and assistant turns."
                >
                  <Switch
                    checked={showTimestamps}
                    onCheckedChange={(v) => flip(v === true, setShowTimestamps, 'Timestamps')}
                    aria-label="Show timestamps"
                  />
                </SettingRow>
              </SectionCard>
            </div>
          )}

          {activeSection === 'chat' && (
            <div className="anim-fade-in space-y-5">
              <SectionCard className="divide-y divide-hairline">
                <SettingRow
                  icon={Brain}
                  title="AI Memory"
                  description="Remember preferences and standing context across conversations."
                >
                  <Switch
                    checked={aiMemory}
                    onCheckedChange={(v) => flip(v === true, setAiMemory, 'AI memory')}
                    aria-label="Enable AI memory"
                  />
                </SettingRow>
                <SettingRow
                  icon={Radio}
                  title="Stream responses"
                  description="Render tokens progressively as they arrive from the model."
                >
                  <Switch
                    checked={streamResponses}
                    onCheckedChange={(v) => flip(v === true, setStreamResponses, 'Streaming')}
                    aria-label="Stream responses"
                  />
                </SettingRow>
                <SettingRow
                  icon={Keyboard}
                  title="Enter to send"
                  description="Press Enter to send messages, and Shift+Enter to insert a newline."
                >
                  <Switch
                    checked={enterToSend}
                    onCheckedChange={(v) => flip(v === true, setEnterToSend, 'Enter to send')}
                    aria-label="Enter to send"
                  />
                </SettingRow>
              </SectionCard>
            </div>
          )}

          {activeSection === 'personalize' && (
            <div className="anim-fade-in space-y-5">
              <SectionCard>
                <div className="mb-3">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Custom instructions</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Standing directions Krittim follows in every chat — your role, preferred stack, or formatting rules.
                  </p>
                </div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  maxLength={4000}
                  rows={5}
                  placeholder="e.g. I'm a backend engineer. Answer with TypeScript, keep explanations direct, and note trade-offs."
                  className="w-full resize-y rounded-xl border border-hairline bg-surface-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Saved automatically to this browser</span>
                  <span className="font-mono tabular-nums">{customInstructions.length}/4000</span>
                </div>
              </SectionCard>

              <SectionCard>
                <div className="mb-3">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Response length</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Set the default verbosity for assistant replies.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {RESPONSE_STYLE_OPTIONS.map((option) => {
                    const active = responseStyle === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setResponseStyle(option.id as ResponseStyle);
                          toast.success(`${option.name} responses selected`, { duration: 1200 });
                        }}
                        aria-pressed={active}
                        className={cn(
                          'flex flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left outline-none transition-colors active:scale-[0.98]',
                          active
                            ? 'border-brand/55 bg-brand/[0.11] text-foreground'
                            : 'border-hairline bg-surface-soft text-muted-foreground hover:border-brand/30 hover:text-foreground',
                        )}
                      >
                        <span className="text-sm font-semibold text-foreground">{option.name}</span>
                        <span className="text-xs text-muted-foreground">{option.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="anim-fade-in space-y-5">
              <SectionCard>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-soft text-base font-semibold text-white">
                      {user?.initials ?? '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {user?.name ?? 'Guest Session'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user ? `${user.email} · ${user.plan}` : 'Sign in to sync your profile and threads'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isAuthenticated ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/profile')}
                          className="rounded-xl border-hairline bg-surface"
                        >
                          Manage profile
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await logout();
                            toast.success('Logged out');
                            router.push('/login');
                          }}
                          className="rounded-xl text-muted-foreground hover:text-foreground"
                        >
                          <LogOut className="size-3.5" /> Log out
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => router.push('/login')}
                        className="rounded-xl bg-brand text-white hover:bg-brand/90"
                      >
                        Log in
                      </Button>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="anim-fade-in space-y-5">
              <SectionCard danger className="divide-y divide-destructive/15">
                <SettingRow
                  icon={Trash2}
                  title="Clear all chats"
                  description="Deletes every conversation and message in this workspace. Your groups and preferences stay intact."
                >
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmClearOpen(true)}
                    className="whitespace-nowrap rounded-xl"
                  >
                    <Trash2 className="size-3.5" />
                    Clear chats
                  </Button>
                </SettingRow>

                <SettingRow
                  icon={DatabaseZap}
                  title="Reset browser storage"
                  description="Wipes all chats, groups, messages, and local preferences from this browser."
                >
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmResetOpen(true)}
                    className="whitespace-nowrap rounded-xl"
                  >
                    <Eraser className="size-3.5" />
                    Reset storage
                  </Button>
                </SettingRow>
              </SectionCard>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear all chats?"
        description="This permanently removes all conversation threads and messages stored in this browser."
        confirmLabel="Clear all chats"
        destructive
        onConfirm={() => {
          clearAllChats();
          toast.success('All chats cleared');
          router.push('/');
        }}
      />

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Reset browser storage?"
        description="Every chat, group, custom instruction, and theme preference in this browser will be erased."
        confirmLabel="Reset everything"
        destructive
        onConfirm={() => {
          resetAllData();
          router.push('/');
        }}
      />
    </div>
  );
}