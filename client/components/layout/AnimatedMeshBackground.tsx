/**
 * AnimatedMeshBackground — Server Component, zero JS.
 * One static colored wash + slow blobs (desktop only) + dot matrix + grain.
 * Fully theme-aware: light mode gets a light emerald canvas instead of dark.
 * Phones get a frozen wash: no 50vmax blur animation eating the GPU.
 */
export default function AnimatedMeshBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* base wash from top — theme-aware emerald atmosphere */}
      <div className="bg-wash absolute inset-0" />
      {/* desktop aurora — CSS transform-only drift */}
      <div
        className="k-blob-a blob-a absolute -top-1/4 left-1/4 hidden h-[50vmax] w-[50vmax] -translate-x-1/2 rounded-full opacity-55 blur-[110px] will-change-transform md:block"
      />
      <div
        className="k-blob-b blob-b absolute top-1/3 -right-1/4 hidden h-[44vmax] w-[44vmax] rounded-full opacity-50 blur-[110px] will-change-transform md:block"
      />
      {/* mobile: single faint static glow, no animation */}
      <div
        className="blob-a absolute left-1/2 top-[-18%] h-[75vw] w-[95vw] -translate-x-1/2 rounded-full opacity-50 blur-[80px] md:hidden"
      />
      <div className="dot-matrix absolute inset-0" />
      <div className="noise-overlay absolute inset-0 mix-blend-overlay" />
      {/* vignette — theme-aware */}
      <div className="vignette absolute inset-0" />
    </div>
  );
}
