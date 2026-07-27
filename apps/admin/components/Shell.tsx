'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, RequireAdmin } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/orders', label: 'Orders' },
  { href: '/products', label: 'Inventory' },
  { href: '/discounts', label: 'Discounts' },
  { href: '/settings', label: 'Settings' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  // The login page renders bare — no nav, no admin gate.
  if (pathname === '/login') return <>{children}</>;

  return (
    <RequireAdmin>
      <div className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
            <Link href="/" className="font-semibold tracking-tight text-cch-blue">
              CCH Admin
            </Link>

            <nav className="flex flex-1 gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                      active
                        ? 'bg-cch-blue/10 font-medium text-cch-blue'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-slate-500 sm:inline">{user?.email}</span>
              <button onClick={signOut} className="text-slate-600 underline hover:text-cch-blue">
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      </div>
    </RequireAdmin>
  );
}
