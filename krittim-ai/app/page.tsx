import { AppShell } from "@/components/layout/AppShell";

/**
 * Home — Server Component wrapper.
 * Renders the ambient background layers plus the interactive client shell.
 * Keeping this on the server preserves streaming + zero JS for the frame.
 */
export default function Home() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      <AppShell />
    </main>
  );
}
