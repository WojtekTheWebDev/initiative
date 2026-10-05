import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The HUD floats in every corner of the window, where the dev indicator would sit
  // under a cluster. Compile and runtime errors still show.
  devIndicators: false,
};

export default nextConfig;
