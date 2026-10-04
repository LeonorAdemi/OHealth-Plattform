import type { MetadataRoute } from "next";

// Macht die App auf dem Homescreen installierbar (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OHealth",
    short_name: "OHealth",
    description: "Workouts tracken und in der Gruppe vergleichen.",
    lang: "de",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
