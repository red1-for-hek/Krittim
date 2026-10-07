'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList, ThreadSkeleton } from '@/components/chat/MessageList';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import AnimatedMeshBackground from '@/components/layout/AnimatedMeshBackground';
import { TopBar } from '@/components/layout/TopBar';
import { CommandPalette } from '@/components/command/CommandPalette';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { MobileSidebar, Sidebar } from '@/components/ui/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/useIsMobile';
import { applyThemeEffect, selectActiveMessages, useChatStore } from '@/store/chatStore';

/* -------------------------------------------------------------------------- */
/*  AppShell — the single client boundary that owns the product chrome         */
/*                                                                            */
/*  Grid:  sidebar (rail ⇄ drawer) · top bar · thread canvas · composer.      */
/*  Also mounts the global layer: command palette, settings dialog, toasts,   */
/*  theme sync effect and keyboard shortcuts. Everything below this file is    */
/*  either a client island or pure presentational server-safe markup.          */
/* -------------------------------------------------------------------------- */



export function AppShell() {
  const isMobile = useIsMobile();

  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);

  const activeChatId = useChatStore((s) => s.activeChatId);
  const messages = useChatStore(selectActiveMessages);
  const hasThread = activeChatId !== null && messages.length > 0;

  /* ---- mount effects: theme sync + global shortcuts ---- */
  const setPaletteOpen = useChatStore((s) => s.setPaletteOpen);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  useEffect(() => applyThemeEffect(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();

      if (key === 'k' && !event.shiftKey) {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (key === ',' || key === '[' || key === 'j') {
        // ⌘, opens settings; ⌘[ / ⌘J toggle the sidebar.
        if (key === ',') setSettingsOpen(true);
        else toggleSidebar();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, setSettingsOpen, toggleSidebar]);

  /* ---- brief skeleton when switching between populated threads ---- */
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    if (!activeChatId) return;
    setSwitching(true);
    const t = setTimeout(() => setSwitching(false), 380);
    return () => clearTimeout(t);
  }, [activeChatId]);

  /* ---- shared canvas (thread / welcome / empty) ---- */
  const canvas = (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {hasThread ? (
          <motion.div
            key={`thread-${activeChatId}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-0 flex-1"
          >
            {switching ? <ThreadSkeleton /> : <MessageList />}
          </motion.div>
        ) : activeChatId ? (
          /* chat selected but still empty → welcome scoped to that chat */
          <motion.div
            key="welcome-chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-0 flex-1"
          >
            <WelcomeScreen onPrompt={(p) => useChatStore.getState().sendMessage(p)} />
          </motion.div>
        ) : (
          /* no chat at all → first-run empty state */
          <motion.div
            key="welcome-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-0 flex-1"
          >
            <WelcomeScreen
              onPrompt={(p) => {
                // Lazily create a fresh chat, then send — sendMessage would do both,
                // but creating first guarantees the "New chat created" toast + pin.
                useChatStore.getState().createChat(null);
                useChatStore.getState().sendMessage(p);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <TooltipProvider>
      {/* ambient aurora / dot-matrix background (pure CSS, server-safe markup) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <AnimatedMeshBackground />
      </div>

      <div className="flex h-dvh w-full overflow-hidden">
        {/* ------------------------------ sidebar ------------------------------ */}
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="gap-0 p-0">
              <MobileSidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        ) : (
          /* Desktop: SidebarPanel animates its own width (280 ⇄ 68) from the store —
             it is never unmounted, so the rail and full sidebar share one instance. */
          <Sidebar />
        )}

        {/* ---------------------------- main column ---------------------------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          {canvas}
          <ChatInput />
        </div>
      </div>

      {/* --------------------------- global overlays --------------------------- */}
      <CommandPalette />
      <SettingsModal />

      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            '!rounded-xl !border !border-white/10 !bg-[oklch(0.19_0.008_265/92%)] !backdrop-blur-xl !text-zinc-100 !shadow-[0_20px_60px_-20px_black]',
          duration: 2600,
        }}
        closeButton
        richColors={false}
      />
    </TooltipProvider>
  );
}
