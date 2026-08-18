'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  available: boolean;
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '' });
  const [creating, setCreating] = useState(false);

  const loadProducts = () => {
    fetch('/api/products?all=true')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setProducts(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(loadProducts, []);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditPrice(String(p.price));
  };

  const savePrice = async (id: number) => {
    const price = Number(editPrice);
    if (!price || price <= 0) return;
    setSavingId(id);
    try {
      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price }),
      });
      setEditingId(null);
      loadProducts();
    } finally {
      setSavingId(null);
    }
  };

  const toggleAvailable = async (p: Product) => {
    setSavingId(p.id);
    try {
      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, available: !p.available }),
      });
      loadProducts();
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.price) return;
    setCreating(true);
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name.trim(),
          description: newProduct.description.trim() || null,
          price: Number(newProduct.price),
          category: newProduct.category.trim() || null,
        }),
      });
      setNewProduct({ name: '', description: '', price: '', category: '' });
      setShowNewForm(false);
      loadProducts();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Productos y stock</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {status === 'ready' ? `${products.length} productos cargados` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)]"
        >
          {showNewForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2"
        >
          <input
            placeholder="Nombre"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            className="rounded-lg border border-[var(--border)] p-2.5"
            required
          />
          <input
            placeholder="Categoría"
            value={newProduct.category}
            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            className="rounded-lg border border-[var(--border)] p-2.5"
          />
          <input
            placeholder="Precio"
            type="number"
            step="0.01"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
            className="rounded-lg border border-[var(--border)] p-2.5"
            required
          />
          <input
            placeholder="Descripción"
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            className="rounded-lg border border-[var(--border)] p-2.5"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-[var(--success)] py-2.5 font-semibold text-white hover:bg-[var(--success-hover)] disabled:opacity-60 sm:col-span-2"
          >
            {creating ? 'Guardando…' : 'Crear producto'}
          </button>
        </form>
      )}

      {status === 'loading' && <p className="mt-6 text-[var(--text-muted)]">Cargando…</p>}
      {status === 'error' && <p className="mt-6 text-[var(--danger)]">No se pudieron cargar los productos.</p>}

      {status === 'ready' && (
        <div className="mt-6 grid gap-3">
          {products.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border p-4 ${
                p.available ? 'border-[var(--border)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-hover)] opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold">{p.name}</h3>
                  {p.category && <p className="text-xs text-[var(--text-muted)]">{p.category}</p>}
                </div>

                <div className="flex items-center gap-2">
                  {editingId === p.id ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24 rounded-lg border border-[var(--border)] p-1.5 text-right"
                        autoFocus
                      />
                      <button
                        onClick={() => savePrice(p.id)}
                        disabled={savingId === p.id}
                        className="rounded-lg bg-[var(--success)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--success-hover)]"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--surface-hover)]"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-[var(--accent)]">{currency.format(p.price)}</span>
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--surface-hover)]"
                      >
                        Editar precio
                      </button>
                      <button
                        onClick={() => toggleAvailable(p)}
                        disabled={savingId === p.id}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                          p.available
                            ? 'border border-[var(--danger)]/50 text-[var(--danger)] hover:bg-[var(--danger)]/10'
                            : 'bg-[var(--success)] text-white hover:bg-[var(--success-hover)]'
                        }`}
                      >
                        {p.available ? 'Ocultar' : 'Activar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}