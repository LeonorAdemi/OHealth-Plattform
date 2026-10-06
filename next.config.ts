import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Alte Adressen: „Gruppe“ und die Community-Übersicht heißen jetzt „Gruppen“, eine Aktivität liegt
  // unter /aktivitaet statt /workouts (N5). Detailseiten der Communities bleiben unter /community/[id].
  async redirects() {
    return [
      {
        source: "/workouts/:id([0-9a-fA-F\\-]{36})/bearbeiten",
        destination: "/aktivitaet/:id/bearbeiten",
        permanent: true,
      },
      { source: "/workouts/:id([0-9a-fA-F\\-]{36})", destination: "/aktivitaet/:id", permanent: true },
      { source: "/community", destination: "/gruppen", permanent: true },
      {
        source: "/gruppe",
        has: [{ type: "query", key: "g", value: "(?<id>[0-9a-fA-F-]{36})" }],
        destination: "/community/:id",
        permanent: true,
      },
      { source: "/gruppe", destination: "/gruppen", permanent: true },
    ];
  },
};

export default nextConfig;
