import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root. Without this Next walks up and finds the stray
  // package-lock.json in the home directory, which breaks Netlify's file tracing.
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  // The shared package is TypeScript source, not a build artifact.
  transpilePackages: ['@cch/shared'],
  images: {
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
