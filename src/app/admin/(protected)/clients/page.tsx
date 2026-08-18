'use client';

import { useEffect, useState } from 'react';

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  total_orders: number;
  total_spent: string;
  last_order_at: string;
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setCustomers(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Clientes</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {status === 'ready' ? `${customers.length} clientes registrados` : ''}
      </p>

      {status === 'loading' && <p className="mt-6 text-[var(--text-muted)]">Cargando…</p>}
      {status === 'error' && <p className="mt-6 text-[var(--danger)]">No se pudieron cargar los clientes.</p>}
      {status === 'ready' && customers.length === 0 && (
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
          Todavía no hay pedidos de clientes.
        </div>
      )}

      {status === 'ready' && customers.length > 0 && (
        <div className="mt-6 grid gap-3">
          {customers.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-[family-name:var(--font-display)] font-bold">{c.name}</h3>
                <span className="font-semibold text-[var(--accent)]">{currency.format(Number(c.total_spent))}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">{c.phone}</p>
              {c.address && <p className="text-sm text-[var(--text-muted)]">{c.address}</p>}
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {c.total_orders} {c.total_orders === 1 ? 'pedido' : 'pedidos'} · último el{' '}
                {new Date(c.last_order_at).toLocaleDateString('es-AR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}