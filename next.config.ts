import type { NextConfig } from "next";

// Every page here is personal and cookie-based, so no static prerendering / component caching.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
