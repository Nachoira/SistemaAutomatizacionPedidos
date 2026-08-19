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

const theme = {
  '--bg': '#f7f5f1',
  '--surface': '#ffffff',
  '--surface-hover': '#f1ede6',
  '--border': '#e3ddd2',
  '--text': '#26211a',
  '--text-muted': '#7a7264',
  '--accent': '#b5651d',
  '--accent-hover': '#9c561a',
  '--accent-contrast': '#ffffff',
  '--success': '#3f7d4a',
  '--success-hover': '#356b3f',
  '--danger': '#b23b2e',
  '--blue': '#2f6fa8',
  '--blue-hover': '#285f8f',
  '--amber': '#b5651d',
} as React.CSSProperties;

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div
      style={theme}
      className={`${display.variable} ${body.variable} min-h-screen bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--text)]`}
    >
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
  <div className="mx-auto max-w-5xl px-5 py-4">
    <div className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            pathname === item.href
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          {item.label}
        </Link>
      ))}

      <button
        onClick={handleLogout}
        className="ml-auto rounded-lg border border-[var(--danger)]/40 px-2.5 py-1 text-xs font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10"
      >
        Cerrar sesión
      </button>
    </div>
  </div>
</header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}