'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { TopBar } from '@/components/layout/TopBar';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { MobileSidebar, Sidebar } from '@/components/ui/Sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useChatStore } from '@/store/chatStore';

/**
 * AppShell — the three-pane application frame.
 *
 * Desktop ≥ md : fixed glass sidebar rail + top bar + scrollable thread.
 * Mobile       : sheet drawer + compact top bar.
 *
 * The thread area conditionally renders the editorial WelcomeScreen while the
 * conversation is empty, then swaps to the live MessageList (Zustand-driven)
 * with a cross-fade so nothing ever jumps.
 */
export function AppShell() {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);
  const hasMessages = useChatStore((s) => s.messages.length > 0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* Close the mobile drawer automatically when the viewport grows past md. */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => e.matches && setMobileNavOpen(false);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <TooltipProvider>
      <div className="relative flex h-dvh overflow-hidden bg-background text-foreground antialiased">
        {/* ambient glow behind everything — black-glass aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/3 size-[520px] rounded-full bg-brand/[0.07] blur-[140px]" />
          <div className="absolute bottom-[-20%] right-[-10%] size-[420px] rounded-full bg-brand-soft/[0.05] blur-[120px]" />
        </div>

        {/* Desktop sidebar */}
        <Sidebar />

        {/* Mobile drawer */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[280px] gap-0 border-white/[0.08] p-0 sm:w-[280px]">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <MobileSidebar onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main column */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <TopBar onToggleSidebar={() => (window.matchMedia('(min-width: 768px)').matches ? toggleSidebar() : setMobileNavOpen(true))} />

          {/* Scrollable thread */}
          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
              <AnimatePresence mode="wait">
                {hasMessages ? (
                  <motion.div
                    key="thread"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <MessageList />
                  </motion.div>
                ) : (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="pt-6 md:pt-12"
                  >
                    <WelcomeScreen onPrompt={(text: string) => useChatStore.getState().sendMessage(text)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* Composer docked at the bottom */}
          <footer className="shrink-0 px-4 pb-4 pt-2 md:px-6 md:pb-5">
            <div className="mx-auto w-full max-w-3xl">
              <ChatInput />
            </div>
          </footer>
        </div>

        {/* Global overlays */}
        <SettingsModal />
      </div>
    </TooltipProvider>
  );
}
