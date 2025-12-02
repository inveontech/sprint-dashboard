/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  // Development performance optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Disable type checking during development (use IDE instead)
    typescript: {
      ignoreBuildErrors: true,
    },
    // Disable ESLint during development
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
};

module.exports = nextConfig;

