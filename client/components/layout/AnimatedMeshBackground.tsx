/**
 * AnimatedMeshBackground — Server Component, zero JS.
 * One static emerald wash + one slow blob (desktop only) + dot matrix + grain.
 * Phones get a frozen wash: no 50vmax blur animation eating the GPU.
 */
export default function AnimatedMeshBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* base wash from top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -10%, oklch(0.18 0.04 155 / 50%), transparent 60%)",
        }}
      />
      {/* desktop aurora — CSS transform-only drift */}
      <div
        className="k-blob-a absolute -top-1/4 left-1/4 hidden h-[46vmax] w-[46vmax] -translate-x-1/2 rounded-full opacity-25 blur-[100px] will-change-transform md:block"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.52 0.18 155 / 38%), transparent 65%)",
        }}
      />
      <div
        className="k-blob-b absolute top-1/3 -right-1/4 hidden h-[40vmax] w-[40vmax] rounded-full opacity-20 blur-[110px] will-change-transform md:block"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.65 0.14 175 / 28%), transparent 65%)",
        }}
      />
      {/* mobile: single faint static glow, no animation */}
      <div
        className="absolute left-1/2 top-[-20%] h-[70vw] w-[90vw] -translate-x-1/2 rounded-full blur-[80px] md:hidden"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.52 0.18 155 / 22%), transparent 65%)",
        }}
      />
      <div className="dot-matrix absolute inset-0" />
      <div className="noise-overlay absolute inset-0 mix-blend-overlay" />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, oklch(0.1 0.005 155 / 90%))",
        }}
      />
    </div>
  );
}
