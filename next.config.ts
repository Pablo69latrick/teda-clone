import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for all responses
  compress: true,

  // Optimise images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Reduce powered-by header noise
  poweredByHeader: false,

  // Strict React mode for catching bugs early
  reactStrictMode: true,

  // Experimental perf flags
  experimental: {
    // Optimise package imports to only include what's used
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
};

export default nextConfig;
