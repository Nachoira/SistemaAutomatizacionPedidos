'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  note?: string;
}

interface DeliveryPerson {
  id: number;
  name: string;
}

interface Order {
  id: number;
  customer_name: string;
  phone?: string;
  address?: string | null;
  payment_method: string;
  total: number;
  delivery_price: number;
  delivery_person_id: number | null;
  delivery_type: 'delivery' | 'retira';
  items: OrderItem[];
  status: OrderStatus;
  created_at?: string;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  ordersToday: number;
  revenueToday: number;
}

type OrderStatus = 'PENDIENTE' | 'TOMADO' | 'EN_CAMINO' | 'ENTREGADO' | 'RECHAZADO';

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
    { next: 'TOMADO', label: 'Tomar pedido', style: 'bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-white',
      message: (o) => `Hola ${o.customer_name}! Tu pedido #${o.id} fue tomado y ya lo estamos preparando.` },
    { next: 'RECHAZADO', label: 'Rechazar', style: 'border border-[var(--danger)]/50 text-[var(--danger)] hover:bg-[var(--danger)]/10', confirm: true,
      message: (o) => `Hola ${o.customer_name}, disculpanos, estamos saturados y no podemos tomar tu pedido #${o.id} en este momento.` },
  ],
  TOMADO: [
    { next: 'EN_CAMINO', label: 'Marcar en camino', style: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)]',
      message: (o) => `Hola ${o.customer_name}! Tu pedido #${o.id} va en camino hacia tu dirección.` },
  ],
  EN_CAMINO: [
    { next: 'ENTREGADO', label: 'Marcar entregado', style: 'bg-[var(--success)] hover:bg-[var(--success-hover)] text-white',
      message: (o) => `Gracias por tu pedido, ${o.customer_name}! Que lo disfrutes.` },
  ],
};

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'recién';
  if (diffMin < 60) return `hace ${diffMin} min`;
  return `hace ${Math.round(diffMin / 60)} h`;
}

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
    // Sin interacción previa del usuario el audio puede fallar — no es crítico.
  }
}

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryPeople, setDeliveryPeople] = useState<DeliveryPerson[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<OrderStatus | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: ActionDef } | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const knownIds = useRef<Set<number> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ordersRes, statsRes, deliveryRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/orders/stats'),
        fetch('/api/delivery-people'),
      ]);
      if (!ordersRes.ok) throw new Error('fetch failed');

      const data: Order[] = await ordersRes.json();
      const normalized = data.map((o) => ({ ...o, status: o.status || 'PENDIENTE' }));

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
      if (statsRes.ok) setStats(await statsRes.json());
      if (deliveryRes.ok) setDeliveryPeople(await deliveryRes.json());
      setStatus('ready');
      setLastSync(new Date());
    } catch {
      setStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const runAction = async (order: Order, action: ActionDef) => {
    setActioningId(order.id);
    setConfirmAction(null);
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: action.next }),
      });
      await fetchAll();

      if (order.phone) {
        const cleanPhone = order.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(action.message(order))}`, '_blank');
      }
    } finally {
      setActioningId(null);
    }
  };

  const handleActionClick = (order: Order, action: ActionDef) => {
    if (action.confirm) setConfirmAction({ order, action });
    else runAction(order, action);
  };

  const assignDelivery = async (order: Order, deliveryPersonId: number | null) => {
    setActioningId(order.id);
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, delivery_person_id: deliveryPersonId }),
      });
      await fetchAll();
    } finally {
      setActioningId(null);
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
        if (a.status === 'PENDIENTE' && b.status !== 'PENDIENTE') return -1;
        if (b.status === 'PENDIENTE' && a.status !== 'PENDIENTE') return 1;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [orders, filter, search]);

  const tabs: { key: OrderStatus | 'TODOS'; label: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'PENDIENTE', label: 'Pendientes' },
    { key: 'TOMADO', label: 'Tomados' },
    { key: 'EN_CAMINO', label: 'En camino' },
    { key: 'ENTREGADO', label: 'Entregados' },
    { key: 'RECHAZADO', label: 'Rechazados' },
  ];

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Pedidos</h1>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {lastSync ? `Actualizado ${timeAgo(lastSync.toISOString())}` : 'Sincronizando…'}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Pedidos totales" value={stats ? String(stats.totalOrders) : '—'} />
        <MetricCard label="Facturado total" value={stats ? currency.format(stats.totalRevenue) : '—'} />
        <MetricCard label="Pedidos hoy" value={stats ? String(stats.ordersToday) : '—'} />
        <MetricCard label="Facturado hoy" value={stats ? currency.format(stats.revenueToday) : '—'} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
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
        className="mt-4 mb-6 w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm outline-none placeholder:text-[var(--text-muted)]/60 focus:border-[var(--accent)]"
      />

      {status === 'loading' && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--surface)] p-6 text-center">
          <p className="font-semibold">No se pudieron cargar los pedidos.</p>
          <button onClick={fetchAll} className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-hover)]">
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
            const isDelivery = order.delivery_type !== 'retira';

            return (
              <div
                key={order.id}
                className={`flex flex-col gap-4 rounded-xl border bg-[var(--surface)] p-4 transition-colors ${
                  isNew ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>{cfg.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">#{order.id}</span>
                  {order.created_at && <span className="text-xs text-[var(--text-muted)]">· {timeAgo(order.created_at)}</span>}
                  {isNew && (
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--accent-contrast)]">Nuevo</span>
                  )}
                  <span
                    className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      isDelivery
                        ? 'border-[var(--blue)]/40 text-[var(--blue)]'
                        : 'border-[var(--success)]/40 text-[var(--success)]'
                    }`}
                  >
                    {isDelivery ? 'Delivery' : 'Retira en local'}
                  </span>
                </div>

                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">{order.customer_name}</h3>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    Tel: <span className="text-[var(--text)]">{order.phone || 'no especificado'}</span>
                  </p>
                  {isDelivery && order.address && <p className="text-sm text-[var(--text-muted)]">{order.address}</p>}
                  {!isDelivery && <p className="text-sm font-semibold text-[var(--success)]">Retira en el local</p>}
                  <p className="text-sm text-[var(--text-muted)]">{order.payment_method}</p>
                </div>

                <div className="space-y-1 border-t border-[var(--border)] pt-3">
                  {order.items.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text)]">{item.quantity}x {item.name}</span>
                        <span className="text-[var(--text-muted)]">{currency.format(item.price * item.quantity)}</span>
                      </div>
                      {item.note && <p className="text-xs italic text-[var(--accent)]">Nota: {item.note}</p>}
                    </div>
                  ))}
                  {isDelivery && (
                    <div className="flex justify-between text-sm text-[var(--text-muted)]">
                      <span>Envío</span>
                      <span>{currency.format(order.delivery_price || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[var(--border)] pt-2 font-semibold">
                    <span>Total</span>
                    <span className="text-[var(--accent)]">{currency.format(order.total)}</span>
                  </div>
                </div>

                {isDelivery && (order.status === 'TOMADO' || order.status === 'EN_CAMINO') && (
                  <div className="border-t border-[var(--border)] pt-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Delivery asignado
                    </label>
                    <select
                      value={order.delivery_person_id ?? ''}
                      onChange={(e) => assignDelivery(order, e.target.value ? Number(e.target.value) : null)}
                      disabled={isBusy}
                      className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Sin asignar</option>
                      {deliveryPeople.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                  {actions.length === 0 && <span className="text-xs text-[var(--text-muted)]">Sin acciones disponibles</span>}
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

      {confirmAction && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">¿Rechazar el pedido #{confirmAction.order.id}?</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Se le va a enviar un WhatsApp a {confirmAction.order.customer_name} avisándole. No se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-sm font-semibold hover:bg-[var(--surface-hover)]">
                Cancelar
              </button>
              <button onClick={() => runAction(confirmAction.order, confirmAction.action)} className="rounded-lg bg-[var(--danger)] px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                Sí, rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">{value}</p>
    </div>
  );
}