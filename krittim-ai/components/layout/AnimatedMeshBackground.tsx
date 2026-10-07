/**
 * AnimatedMeshBackground — Server Component (no "use client")
 * ------------------------------------------------------------
 * Purely decorative ambient layers rendered behind the app shell:
 *  1. Three slowly drifting radial "aurora" blobs (violet / cyan / magenta)
 *     driven by CSS keyframes — GPU-friendly, zero hydration cost.
 *  2. A faint dot-matrix texture that fades toward the edges.
 *  3. An SVG noise grain overlay + soft vignette for depth.
 */

const meshKeyframes = `
@keyframes krittim-drift-a {
  0%, 100% { transform: translate3d(-8%, -6%, 0) scale(1); }
  50%      { transform: translate3d(10%, 8%, 0) scale(1.15); }
}
@keyframes krittim-drift-b {
  0%, 100% { transform: translate3d(6%, 10%, 0) scale(1.1); }
  50%      { transform: translate3d(-10%, -8%, 0) scale(0.95); }
}
@keyframes krittim-drift-c {
  0%, 100% { transform: translate3d(0%, 6%, 0) scale(1); }
  50%      { transform: translate3d(8%, -10%, 0) scale(1.2); }
}
@media (prefers-reduced-motion: reduce) {
  .krittim-blob { animation: none !important; }
}
`;

export default function AnimatedMeshBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <style>{meshKeyframes}</style>

      {/* Base wash from the top edge */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,oklch(0.21_0.03_275/60%),transparent_60%)]" />

      {/* Drifting aurora blobs */}
      <div
        className="krittim-blob absolute -top-1/4 left-1/4 h-[60vmax] w-[60vmax] -translate-x-1/2 rounded-full opacity-40 blur-[120px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.55 0.22 285 / 45%), transparent 65%)",
          animation: "krittim-drift-a 26s ease-in-out infinite",
        }}
      />
      <div
        className="krittim-blob absolute top-1/3 -right-1/4 h-[50vmax] w-[50vmax] rounded-full opacity-30 blur-[130px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.7 0.14 220 / 35%), transparent 65%)",
          animation: "krittim-drift-b 34s ease-in-out infinite",
        }}
      />
      <div
        className="krittim-blob absolute -bottom-1/3 left-1/3 h-[55vmax] w-[55vmax] rounded-full opacity-25 blur-[140px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.5 0.18 320 / 30%), transparent 65%)",
          animation: "krittim-drift-c 40s ease-in-out infinite",
        }}
      />

      {/* Dot matrix + film grain */}
      <div className="dot-matrix absolute inset-0" />
      <div className="noise-overlay absolute inset-0 mix-blend-overlay" />

      {/* Vignette to focus the center of the canvas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_90%_at_50%_50%,transparent_55%,oklch(0.1_0.005_265/85%))]" />
    </div>
  );
}
