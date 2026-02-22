import type { NextConfig } from "next";

const TV_CDN = 'https://charting-library.tradingview-widget.com'

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for all responses
  compress: true,

  // Proxy TradingView charting library files to same-origin.
  // REQUIRED: the charting library iframe needs window.parent access (same-origin).
  async rewrites() {
    return [
      {
        source: '/tv/:path*',
        destination: `${TV_CDN}/:path*`,
      },
    ]
  },

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
