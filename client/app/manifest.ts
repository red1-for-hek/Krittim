import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Krittim AI",
    short_name: "Krittim",
    description:
      "Premium conversational intelligence by BNMPC IT Club — fast answers, deep reasoning, and grounded web research.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#10b981",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
