'use client';

import { AppShell } from "@/components/layout/AppShell";
import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function Home() {
  useEffect(() => {
    // Opening "/" always starts a fresh composer. Do this once only: clearing
    // activeChatId on every store update breaks the thread while it streams.
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
  }, []);

  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      <AppShell />
    </main>
  );
}
