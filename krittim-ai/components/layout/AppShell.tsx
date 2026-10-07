'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { Sidebar, MobileSidebar } from '@/components/ui/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import AnimatedMeshBackground from '@/components/layout/AnimatedMeshBackground';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';

const SPRING = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 } as const;

/**
 * AppShell — Client Component.
 * Owns the application grid: collapsible glass sidebar, sticky top bar,
 * the chat canvas (welcome state ⇄ thread) and the composer dock.
 */
export function AppShell() {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const messages = useChatStore((s) => s.messages);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const hasConversation = messages.length > 0;

  /* ⌘K / Ctrl+K → new chat & focus handled by store consumers later;
     here we map it to toggling a fresh chat for the scaffold pass. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useChatStore.getState().newChat();
      }
      if (e.key === '[' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Ambient animated mesh (decorative, fixed behind everything) */}
      <AnimatedMeshBackground />

      {/* Desktop sidebar — spring width collapse */}
      <Sidebar />

      {/* Mobile sidebar — overlay drawer reusing the same Sidebar component */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              aria-hidden
            />
            <motion.div
              key="mobile-sidebar"
              initial={{ x: -300, opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0.6 }}
              transition={SPRING}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] md:hidden"
            >
              <MobileSidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar onToggleSidebar={toggleSidebar} />

        {/* Canvas */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            {!hasConversation ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-1 items-center justify-center overflow-y-auto"
              >
                <div className="flex w-full max-w-3xl flex-col items-center px-4 py-8">
                  <WelcomeScreen onPrompt={sendMessage} />
                  <ChatInput className="mt-10" autoFocus />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="thread"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col overflow-hidden"
              >
                {/* scrolling transcript */}
                <div className="flex-1 overflow-y-auto">
                  <div className={cn('mx-auto w-full max-w-3xl px-4 py-8 md:px-6')}>
                    <MessageList />
                  </div>
                </div>

                {/* composer dock */}
                <div className="shrink-0 px-4 pb-4 md:px-6 md:pb-6">
                  <div className="mx-auto w-full max-w-3xl">
                    <ChatInput />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
