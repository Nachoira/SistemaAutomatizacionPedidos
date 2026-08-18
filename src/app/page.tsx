'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Bricolage_Grotesque, Inter } from 'next/font/google';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});
const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});

// --- Tipos -------------------------------------------------------------
// Escalable: agregá campos opcionales acá a medida que crezca el backend
// (image_url, available, etc.) sin romper nada de lo existente.
interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  available?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'efectivo' | 'transferencia';

// --- Config del bar ------------------------------------------------------
// Pensado para SaaS: estos props vienen del "tenant" (bar) que use el sistema.
// Por ahora tienen defaults desde env vars para no romper nada hoy.
interface ClientMenuProps {
  barName?: string;
  whatsappNumber?: string; // formato: 549XXXXXXXXXX
  accentColor?: string; // permite theming por cliente a futuro
}

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export default function ClientMenu({
  barName = process.env.NEXT_PUBLIC_BAR_NAME || 'Nuestro Bar',
  whatsappNumber = process.env.NEXT_PUBLIC_BAR_WHATSAPP || '5493865575938',
}: ClientMenuProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [activeCategory, setActiveCategory] = useState('Todos');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('efectivo');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el menú');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'Menú'));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === 'Todos') return products;
    return products.filter((p) => (p.category || 'Menú') === activeCategory);
  }, [products, activeCategory]);

  const updateCart = (id: number, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const updated = current + delta;
      if (updated <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: updated };
    });
  };

  const cartItems: CartItem[] = useMemo(
    () =>
      products
        .filter((p) => cart[p.id])
        .map((product) => ({ product, quantity: cart[product.id] })),
    [products, cart]
  );

  const itemCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const total = cartItems.reduce((acc, i) => acc + i.quantity * i.product.price, 0);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || !phone.trim() || !address.trim() || cartItems.length === 0) {
      setToast({ message: 'Completá tus datos y elegí al menos un producto.', type: 'error' });
      return;
    }
const orderItems = cartItems.map((i) => ({
  product_id: i.product.id,
  quantity: i.quantity,
      name: i.product.name,
      price: i.product.price,
    }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  customer_name: name,
  phone,
  address,
  payment_method: payment,
  items: orderItems,
        }),
      });

      if (!res.ok) throw new Error('Error al enviar el pedido');

      const lines = [
        `*NUEVO PEDIDO*`,
        `*Cliente:* ${name}`,
        `*Teléfono:* ${phone}`,
        `*Dirección:* ${address}`,
        `*Pago:* ${payment}`,
        ``,
        `*Detalle:*`,
        ...orderItems.map(
          (i) => `- ${i.quantity}x ${i.name} (${currency.format(i.price * i.quantity)})`
        ),
        ``,
        `*Total:* ${currency.format(total)}`,
      ];

      window.open(
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`,
        '_blank'
      );

      setToast({ message: 'Pedido enviado. Te esperamos.', type: 'success' });
      setCart({});
      setName('');
      setPhone('');
      setAddress('');
    } catch {
      setToast({ message: 'No se pudo enviar el pedido. Probá de nuevo.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

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
  } as React.CSSProperties;

  return (
    <main
      style={theme}
      className={`${display.variable} ${body.variable} min-h-screen bg-[var(--bg)] pb-28 font-[family-name:var(--font-body)] text-[var(--text)]`}
    >
      {/* Header */}
      <header className="border-b border-[var(--border)] px-5 pb-5 pt-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Pedí online
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
          {barName}
        </h1>
      </header>

      {/* Filtro de categorías */}
      {status === 'ready' && categories.length > 2 && (
        <nav className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg)]/95 px-5 py-3 backdrop-blur">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === c
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
              }`}
            >
              {c}
            </button>
          ))}
        </nav>
      )}

      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Loading */}
        {status === 'loading' && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--surface)] p-6 text-center">
            <p className="font-semibold text-[var(--text)]">No pudimos cargar el menú.</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Revisá tu conexión y volvé a intentar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-hover)]"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Menú vacío */}
        {status === 'ready' && products.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-[var(--text-muted)]">
            Todavía no hay productos cargados.
          </div>
        )}

        {/* Lista de productos */}
        {status === 'ready' && products.length > 0 && (
          <div className="space-y-3">
            {visibleProducts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]/40"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text)]">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-1.5 font-[family-name:var(--font-display)] font-bold text-[var(--accent)]">
                    {currency.format(p.price)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Quitar ${p.name}`}
                    onClick={() => updateCart(p.id, -1)}
                    disabled={!cart[p.id]}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] font-bold text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-semibold tabular-nums">
                    {cart[p.id] || 0}
                  </span>
                  <button
                    type="button"
                    aria-label={`Agregar ${p.name}`}
                    onClick={() => updateCart(p.id, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)]"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario */}
        {total > 0 && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Finalizar pedido
            </h2>

            <Field label="Nombre">
              <input
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="WhatsApp de contacto">
              <input
                type="tel"
                placeholder="Ej: 3865575938"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Dirección de envío">
              <input
                type="text"
                placeholder="Calle y número"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Método de pago">
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value as PaymentMethod)}
                className={inputClass}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </Field>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 font-[family-name:var(--font-display)] text-lg font-bold">
              <span>Total</span>
              <span className="text-[var(--accent)]">{currency.format(total)}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--success)] py-3 font-bold text-[#0f1a0d] transition-colors hover:bg-[var(--success-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Enviando…' : 'Enviar pedido por WhatsApp'}
            </button>
          </form>
        )}
      </div>

      {/* Barra inferior tipo "comanda" */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            onClick={scrollToForm}
            className="mx-auto flex w-full max-w-md items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-contrast)]">
                {itemCount}
              </span>
              {itemCount === 1 ? 'producto' : 'productos'}
            </span>
            <span className="font-[family-name:var(--font-display)] font-bold text-[var(--text)]">
              {currency.format(total)}
            </span>
            <span className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-contrast)]">
              Ver pedido
            </span>
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-[var(--success)]/40 bg-[var(--surface)] text-[var(--success-hover)]'
              : 'border-[var(--danger)]/40 bg-[var(--surface)] text-[var(--danger)]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 text-[var(--text)] placeholder:text-[var(--text-muted)]/60 outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30';