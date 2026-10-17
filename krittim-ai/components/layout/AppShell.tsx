'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
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

/**
 * AppShell — single client boundary. No animation lib:
 * thread/welcome crossfade is one CSS keyframe keyed by chat id.
 */
export function AppShell() {
  const isMobile = useIsMobile();

  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const setPaletteOpen = useChatStore((s) => s.setPaletteOpen);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  const activeChatId = useChatStore((s) => s.activeChatId);
  const messages = useChatStore(selectActiveMessages);
  const hasThread = activeChatId !== null && messages.length > 0;

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
        if (key === ',') setSettingsOpen(true);
        else toggleSidebar();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, setSettingsOpen, toggleSidebar]);

  return (
    <TooltipProvider>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <AnimatedMeshBackground />
      </div>

      <div className="flex h-dvh w-full overflow-hidden">
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="gap-0 p-0">
              <MobileSidebar onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        ) : (
          <Sidebar />
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {hasThread ? (
              <div key={`thread-${activeChatId}`} className="anim-fade-in flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden">
                  <MessageList />
                </div>
                <div className="shrink-0">
                  <ChatInput centered={false} />
                </div>
              </div>
            ) : (
              <div
                key="welcome-centered"
                className="anim-fade-in flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6"
              >
                <div className="my-auto flex w-full max-w-3xl flex-col items-center gap-7 sm:gap-8">
                  <WelcomeScreen />
                  <div className="w-full">
                    <ChatInput centered />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

