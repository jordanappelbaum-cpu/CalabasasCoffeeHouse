import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root. Without this Next walks up and finds the stray
  // package-lock.json in the home directory, which breaks Netlify's file tracing.
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  // The shared package is TypeScript source, not a build artifact.
  transpilePackages: ['@cch/shared'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Stripe.js must load and run for checkout.
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "img-src 'self' data: https://qthptztogfcufabviyrx.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://qthptztogfcufabviyrx.supabase.co https://api.stripe.com",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  images: {
    // Netlify's IPX optimiser has a broken sharp/libvips on this build image,
    // so route through Netlify Image CDN via a custom loader instead.
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qthptztogfcufabviyrx.supabase.co',
        pathname: '/storage/v1/object/public/merch/**',
      },
    ],
  },
};
export default nextConfig;
