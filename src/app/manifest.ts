import type { MetadataRoute } from "next";

/**
 * The Android client is this PWA in v1, so it has to be installable, not just
 * responsive.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Masse",
    short_name: "Masse",
    description: "Le logiciel des coachs de force.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05121b",
    theme_color: "#05121b",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
