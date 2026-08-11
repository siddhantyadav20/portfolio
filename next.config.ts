import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev overlay out of visual-QA screenshots.
  devIndicators: false,
};

export default nextConfig;
