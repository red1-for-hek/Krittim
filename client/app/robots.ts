import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth hand-off pages shouldn't be indexed.
      disallow: ["/auth/", "/api/"],
    },
    sitemap: "https://krittim-client.vercel.app/sitemap.xml",
  };
}
