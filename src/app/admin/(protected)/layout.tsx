'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { display, body } from '@/lib/fonts';

const NAV_ITEMS = [
  { href: '/admin', label: 'Pedidos' },
  { href: '/admin/clients', label: 'Clientes' },
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/settings', label: 'Configuración' },
];

const BAR_NAME = process.env.NEXT_PUBLIC_BAR_NAME || 'Mi Bar';

const theme = {
  '--bg': '#f4f7fd',
  '--surface': '#ffffff',
  '--surface-hover': '#eaf0fb',
  '--border': '#dbe3f0',
  '--text': '#0f1f3d',
  '--text-muted': '#5b6b86',
  '--accent': '#1d4ed8',
  '--accent-hover': '#1e40af',
  '--accent-contrast': '#ffffff',
  '--success': '#15803d',
  '--success-hover': '#166534',
  '--danger': '#dc2626',
  '--blue': '#0284c7',
  '--blue-hover': '#0369a1',
  '--amber': '#d97706',
} as React.CSSProperties;

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const logoutButton = (
    <button
      onClick={handleLogout}
      className="rounded-lg border border-[var(--danger)]/40 px-2.5 py-1 text-xs font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10"
    >
      Cerrar sesión
    </button>
  );

  return (
    <div
      style={theme}
      className={`${display.variable} ${body.variable} min-h-screen overflow-x-clip bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--text)]`}
    >
      {/* Menú lateral: solo computadora */}
      <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col">
        <div className="border-b border-[var(--border)] px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Panel</p>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-extrabold">{BAR_NAME}</h1>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">{logoutButton}</div>
      </aside>

      {/* Barra superior: solo celular */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:hidden">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-extrabold">{BAR_NAME}</h1>
        {logoutButton}
      </header>

      <main className="min-w-0 px-4 py-6 pb-24 md:ml-60 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* Menú inferior: solo celular */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`py-3 text-center text-[11px] font-semibold transition-colors ${
              isActive(item.href) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}