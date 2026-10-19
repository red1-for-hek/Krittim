'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { selectChatBySlug, useChatStore } from '@/store/chatStore';

function ChatPageContent() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? '';

  const chat = useChatStore(selectChatBySlug(slug));
  const selectChat = useChatStore((s) => s.selectChat);
  const activeChatId = useChatStore((s) => s.activeChatId);

  useEffect(() => {
    if (!chat) {
      // Slug not found in local store — go home
      router.replace('/');
      return;
    }

    if (activeChatId !== chat.id) {
      selectChat(chat.id);
    }

  }, [chat, activeChatId, selectChat, router]);

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
