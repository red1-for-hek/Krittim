'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { hydrateSession, isAuthenticated, checking } = useAuthStore();

  useEffect(() => {
    const check = async () => {
      await hydrateSession();
      if (!checking && !isAuthenticated) {
        router.replace('/login');
      }
    };
    void check();
  }, [hydrateSession, isAuthenticated, checking, router]);

  if (checking) return null;

  // Opening "/" always starts a fresh composer
  useEffect(() => {
    if (!isAuthenticated) return;
    const state = useChatStore.getState();
    const emptyIds = state.chats
      .filter((chat) => (state.messagesByChatId[chat.id] ?? []).length === 0)
      .map((chat) => chat.id);
    useChatStore.setState((current) => ({
      chats: current.chats.filter((chat) => !emptyIds.includes(chat.id)),
      messagesByChatId: Object.fromEntries(
        Object.entries(current.messagesByChatId).filter(([id]) => !emptyIds.includes(id)),
      ),
      activeChatId: null,
      isStreaming: false,
      stopRequested: false,
    }));
  }, [isAuthenticated]);

  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      <AppShell />
    </main>
  );
}
