import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shop.calabasascoffeehouse.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Shop — Calabasas Coffee House',
    template: '%s — Calabasas Coffee House',
  },
  description:
    'Hats, hoodies, tees and drinkware from Calabasas Coffee House. Shipped from Calabasas, California.',
  openGraph: {
    type: 'website',
    siteName: 'Calabasas Coffee House',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  // The cafe site is the canonical brand home; this is the shop.
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <CartProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cch-blue focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
