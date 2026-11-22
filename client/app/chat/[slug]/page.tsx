'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { selectChatBySlug, useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

function ChatPageContent() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated, checking, hydrateSession } = useAuthStore();
  const slug = params?.slug ?? '';

  const chat = useChatStore(selectChatBySlug(slug));
  const selectChat = useChatStore((s) => s.selectChat);
  const activeChatId = useChatStore((s) => s.activeChatId);

  useEffect(() => {
    const check = async () => {
      await hydrateSession();
      if (!checking && !isAuthenticated) {
        router.replace('/login');
      }
    };
    void check();
  }, [hydrateSession, isAuthenticated, checking, router]);

  useEffect(() => {
    if (checking || !isAuthenticated) return;
    if (!chat) {
      router.replace('/');
      return;
    }
    if (activeChatId !== chat.id) {
      selectChat(chat.id);
    }
  }, [checking, isAuthenticated, chat, activeChatId, selectChat, router]);

  if (checking || !isAuthenticated) return null;

  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      <AppShell />
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}
