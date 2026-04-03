/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API requests during development so the frontend can call /api/* without CORS issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
