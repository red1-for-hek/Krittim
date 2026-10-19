'use client';

import { AppShell } from "@/components/layout/AppShell";
import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function Home() {
  const chats = useChatStore((s) => s.chats);
  const messagesByChatId = useChatStore((s) => s.messagesByChatId);

  useEffect(() => {
    const emptyIds = chats
      .filter((chat) => (messagesByChatId[chat.id] ?? []).length === 0)
      .map((chat) => chat.id);
    if (emptyIds.length > 0) {
      useChatStore.setState((state) => ({
        chats: state.chats.filter((chat) => !emptyIds.includes(chat.id)),
        messagesByChatId: Object.fromEntries(
          Object.entries(state.messagesByChatId).filter(([id]) => !emptyIds.includes(id)),
        ),
      }));
    }
    if (useChatStore.getState().activeChatId !== null) {
      useChatStore.setState({ activeChatId: null, isStreaming: false, stopRequested: false });
    }
  }, [chats, messagesByChatId]);

  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      <AppShell />
    </main>
  );
}
