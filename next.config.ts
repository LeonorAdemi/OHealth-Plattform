import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Früher hieß der Bereich „Gruppe". Alte Links und Lesezeichen führen zur Community.
  async redirects() {
    return [
      {
        source: "/gruppe",
        has: [{ type: "query", key: "g", value: "(?<id>[0-9a-fA-F-]{36})" }],
        destination: "/community/:id",
        permanent: true,
      },
      { source: "/gruppe", destination: "/community", permanent: true },
    ];
  },
};

export default nextConfig;
