'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Bricolage_Grotesque, Inter } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });

// --- Tipos ---------------------------------------------------------------
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  customer_name: string;
  phone?: string;
  address?: string;
  payment_method: string;
  total: number;
  items: OrderItem[];
  status: OrderStatus;
  created_at?: string;
}

type OrderStatus = 'PENDIENTE' | 'TOMADO' | 'EN_CAMINO' | 'ENTREGADO' | 'RECHAZADO';
// --- Máquina de estados ----------------------------------------------------
// Define qué acciones puede hacer el admin según el estado actual del pedido.
// Escalable: agregar un estado nuevo (ej. "EN_LOCAL" para take-away) es
// una entrada más acá, no hay que tocar el JSX.
const STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string }> = {
  PENDIENTE: { label: 'Pendiente', badge: 'border-[var(--amber)]/40 bg-[var(--amber)]/10 text-[var(--amber)]' },
  TOMADO: { label: 'Tomado', badge: 'border-[var(--blue)]/40 bg-[var(--blue)]/10 text-[var(--blue)]' },
  EN_CAMINO: { label: 'En camino', badge: 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]' },
  ENTREGADO: { label: 'Entregado', badge: 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]' },
  RECHAZADO: { label: 'Rechazado', badge: 'border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]' },
};

interface ActionDef {
  next: OrderStatus;
  label: string;
  style: string;
  confirm?: boolean;
  message: (o: Order) => string;
}

const ACTIONS_BY_STATUS: Partial<Record<OrderStatus, ActionDef[]>> = {
  PENDIENTE: [
    {
      next: 'TOMADO',
      label: 'Tomar pedido',
      style: 'bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-white',
      message: (o) => `¡Hola ${o.customer_name}! Tu pedido #${o.id} fue tomado y ya lo estamos preparando.`,
    },
    {
      next: 'RECHAZADO',
      label: 'Rechazar',
      style: 'border border-[var(--danger)]/50 text-[var(--danger)] hover:bg-[var(--danger)]/10',
      confirm: true,
      message: (o) =>
        `Hola ${o.customer_name}, disculpanos, estamos saturados y no podemos tomar tu pedido #${o.id} en este momento.`,
    },
  ],
  TOMADO: [
    {
      next: 'EN_CAMINO',
      label: 'Marcar en camino',
      style: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)]',
      message: (o) => `¡Hola ${o.customer_name}! Tu pedido #${o.id} va en camino hacia tu dirección.`,
    },
  ],
  EN_CAMINO: [
    {
      next: 'ENTREGADO',
      label: 'Marcar entregado',
      style: 'bg-[var(--success)] hover:bg-[var(--success-hover)] text-[#0f1a0d]',
      message: (o) => `¡Gracias por tu pedido, ${o.customer_name}! Que lo disfrutes 🙌`,
    },
  ],
};

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'recién';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  return `hace ${diffH} h`;
}

// Beep corto generado con Web Audio API, sin depender de un asset externo.
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio no disponible (ej. sin interacción previa del usuario) — no es crítico.
  }
}

export default function AdminPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<OrderStatus | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: ActionDef } | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const knownIds = useRef<Set<number> | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('fetch failed');
      const data: Order[] = await res.json();
      const normalized = data.map((o) => ({ ...o, status: o.status || 'PENDIENTE' }));

      // Detecta pedidos nuevos desde la última consulta para avisar al staff.
      if (knownIds.current) {
        const fresh = normalized.filter((o) => !knownIds.current!.has(o.id));
        if (fresh.length > 0) {
          playNotificationSound();
          setNewIds(new Set(fresh.map((o) => o.id)));
          setTimeout(() => setNewIds(new Set()), 8000);
        }
      }
      knownIds.current = new Set(normalized.map((o) => o.id));

      setOrders(normalized);
      setStatus('ready');
      setLastSync(new Date());
    } catch {
      setStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const runAction = async (order: Order, action: ActionDef) => {
    setActioningId(order.id);
    setConfirmAction(null);
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: action.next }),
      });
      await fetchOrders();

      if (order.phone) {
        const cleanPhone = order.phone.replace(/\D/g, '');
        window.open(
          `https://wa.me/${cleanPhone}?text=${encodeURIComponent(action.message(order))}`,
          '_blank'
        );
      }
    } finally {
      setActioningId(null);
    }
  };

  const handleActionClick = (order: Order, action: ActionDef) => {
    if (action.confirm) {
      setConfirmAction({ order, action });
    } else {
      runAction(order, action);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { TODOS: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    return orders
      .filter((o) => filter === 'TODOS' || o.status === filter)
      .filter((o) => !search.trim() || o.customer_name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => {
        // Pendientes primero, después por más reciente.
        if (a.status === 'PENDIENTE' && b.status !== 'PENDIENTE') return -1;
        if (b.status === 'PENDIENTE' && a.status !== 'PENDIENTE') return 1;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [orders, filter, search]);

  const theme = {
    '--bg': '#16130f',
    '--surface': '#211c17',
    '--surface-hover': '#2a241e',
    '--border': '#362f27',
    '--text': '#f4ebdd',
    '--text-muted': '#a9998a',
    '--accent': '#e4a73b',
    '--accent-hover': '#f0b653',
    '--accent-contrast': '#1b1611',
    '--success': '#6f9a5d',
    '--success-hover': '#7fae6b',
    '--danger': '#d9695a',
    '--blue': '#5f92c9',
    '--blue-hover': '#71a2d8',
    '--amber': '#e4a73b',
  } as React.CSSProperties;

  const tabs: { key: OrderStatus | 'TODOS'; label: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'PENDIENTE', label: 'Pendientes' },
    { key: 'TOMADO', label: 'Tomados' },
    { key: 'EN_CAMINO', label: 'En camino' },
    { key: 'ENTREGADO', label: 'Entregados' },
    { key: 'RECHAZADO', label: 'Rechazados' },
  ];

  return (
    <div
      style={theme}
      className={`${display.variable} ${body.variable} min-h-screen bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--text)]`}
    >
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Panel</p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Pedidos</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {lastSync ? `Actualizado ${timeAgo(lastSync.toISOString())}` : 'Sincronizando…'}
          </p>
        </div>

        {/* Tabs de estado con contador */}
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === t.key
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
              }`}
            >
              {t.label}
              {counts[t.key] ? ` (${counts[t.key]})` : ''}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar por cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6 w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm outline-none placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent)]"
        />

        {status === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--surface)] p-6 text-center">
            <p className="font-semibold">No se pudieron cargar los pedidos.</p>
            <button
              onClick={fetchOrders}
              className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-hover)]"
            >
              Reintentar
            </button>
          </div>
        )}

        {status === 'ready' && visibleOrders.length === 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
            No hay pedidos {filter !== 'TODOS' ? `en "${tabs.find((t) => t.key === filter)?.label}"` : 'todavía'}.
          </div>
        )}

        {status === 'ready' && visibleOrders.length > 0 && (
          <div className="grid gap-3">
            {visibleOrders.map((order) => {
              const cfg = STATUS_CONFIG[order.status];
              const actions = ACTIONS_BY_STATUS[order.status] || [];
              const isNew = newIds.has(order.id);
              const isBusy = actioningId === order.id;

              return (
                <div
                  key={order.id}
                  className={`flex flex-col gap-4 rounded-xl border bg-[var(--surface)] p-4 transition-colors md:flex-row md:items-center md:justify-between ${
                    isNew ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">#{order.id}</span>
                      {order.created_at && (
                        <span className="text-xs text-[var(--text-muted)]">· {timeAgo(order.created_at)}</span>
                      )}
                      {isNew && (
                        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--accent-contrast)]">
                          Nuevo
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold">
                      {order.customer_name}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Tel: <span className="text-[var(--text)]">{order.phone || 'no especificado'}</span>
                    </p>
                    {order.address && <p className="text-sm text-[var(--text-muted)]">{order.address}</p>}
                    <p className="text-sm text-[var(--text-muted)]">
                      {order.payment_method} · <span className="font-semibold text-[var(--text)]">{currency.format(order.total)}</span>
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      {order.items.map((i, idx) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {actions.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)]">Sin acciones disponibles</span>
                    )}
                    {actions.map((action) => (
                      <button
                        key={action.next}
                        onClick={() => handleActionClick(order, action)}
                        disabled={isBusy}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${action.style}`}
                      >
                        {isBusy ? 'Actualizando…' : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmación para acciones destructivas (ej. rechazar) */}
      {confirmAction && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
              ¿Rechazar el pedido #{confirmAction.order.id}?
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Se le va a enviar un WhatsApp a {confirmAction.order.customer_name} avisándole. No se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-sm font-semibold hover:bg-[var(--surface-hover)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => runAction(confirmAction.order, confirmAction.action)}
                className="rounded-lg bg-[var(--danger)] px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Sí, rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}