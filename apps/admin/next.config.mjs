import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cch/shared'],
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qthptztogfcufabviyrx.supabase.co',
        pathname: '/storage/v1/object/public/merch/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // This dashboard must never be indexed, framed, or leak referrers.
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};
export default nextConfig;
