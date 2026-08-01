/**
 * Image loader pointing at Netlify's native Image CDN.
 *
 * Netlify's Next.js runtime routes /_next/image through its legacy IPX
 * function, whose bundled `sharp` fails to load libvips on this build image —
 * every product image returned a 500. Netlify Image CDN at /.netlify/images is
 * a separate, first-party service that does the resizing without IPX.
 *
 * Remote sources must be allow-listed in the root netlify.toml under
 * [images] remote_images, or the CDN refuses to fetch them.
 *
 * Product photos are 3–5 MB straight from a phone camera, so serving them
 * unoptimised is not an option: nine of them on the grid would be a ~40 MB page.
 */

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function netlifyImageLoader({ src, width, quality }: LoaderArgs): string {
  // `next dev` has no /.netlify/images endpoint, so pass the source through
  // untouched locally. Production is where optimisation matters.
  if (process.env.NODE_ENV === 'development') return src;

  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality ?? 75),
  });
  return `/.netlify/images?${params.toString()}`;
}
