import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'CCH Admin',
  description: 'Calabasas Coffee House shop administration',
  // Belt and braces alongside the X-Robots-Tag header in next.config.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
