'use client';

import { useEffect, useState } from 'react';

interface Settings {
  delivery_price: string;
  payment_date: string | null;
  due_date: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Settings) => {
        setSettings(data);
        setDeliveryPrice(data.delivery_price);
        setPaymentDate(data.payment_date?.slice(0, 10) || '');
        setDueDate(data.due_date?.slice(0, 10) || '');
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(false);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_price: Number(deliveryPrice),
          payment_date: paymentDate || null,
          due_date: dueDate || null,
        }),
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Vencido si hoy es posterior a la fecha de vencimiento.
  const isOverdue = dueDate ? new Date(dueDate) < new Date(new Date().toDateString()) : false;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Configuración</h1>

      {status === 'loading' && <p className="mt-6 text-[var(--text-muted)]">Cargando…</p>}
      {status === 'error' && <p className="mt-6 text-[var(--danger)]">No se pudo cargar la configuración.</p>}

      {status === 'ready' && (
        <form onSubmit={handleSave} className="mt-6 max-w-md space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Precio del delivery
            </label>
            <input
              type="number"
              step="0.01"
              value={deliveryPrice}
              onChange={(e) => setDeliveryPrice(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">Sistema — pago mensual</h3>

            {isOverdue && (
              <div className="mb-3 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-2.5 text-sm font-medium text-[var(--danger)]">
                El sistema está vencido según la fecha cargada.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Último pago
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Próximo vencimiento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>

          {savedMsg && <p className="text-center text-sm text-[var(--success)]">Guardado correctamente.</p>}
        </form>
      )}
    </div>
  );
}