'use client';
// Importamos el componente de subida
import ImageUpload from '@/components/ImageUpload';
import { useEffect, useState } from 'react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  available: boolean;
  image_url: string | null;
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null); 

  const [showNewForm, setShowNewForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '', image_url: '' });
  const [creating, setCreating] = useState(false);

  // Referencia oculta para el componente ImageUpload en edición
  const editUploadRef = useState<HTMLInputElement | null>(null);

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
    setEditImageUrl(p.image_url);
  };

  const saveChanges = async (id: number) => {
    const price = Number(editPrice);
    if (!price || price <= 0) {
       alert('El precio debe ser mayor a 0');
       return;
    }
    
    setSavingId(id);
    try {
      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          price: price,
          image_url: editImageUrl 
        }),
      });
      setEditingId(null); 
      loadProducts();     
    } catch (err) {
      console.error('Error guardando cambios:', err);
      alert('No se pudieron guardar los cambios.');
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
          image_url: newProduct.image_url.trim() || null,
        }),
      });
      setNewProduct({ name: '', description: '', price: '', category: '', image_url: '' });
      setShowNewForm(false);
      loadProducts();
    } finally {
      setCreating(false);
    }
  };

  // Esta función auxiliar obtiene la referencia interna del input file de ImageUpload
  const triggerEditUpload = () => {
      // Buscamos el input dentro del DOM del componente ImageUpload activo
      const uploader = document.querySelector(`#uploader-${editingId} input[type="file"]`) as HTMLInputElement;
      uploader?.click();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Productos y stock</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {status === 'ready' ? `${products.length} productos cargados` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition"
        >
          {showNewForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {showNewForm && (
        <form onSubmit={handleCreate} className="mb-8 grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:grid-cols-2">
           <input placeholder="Nombre" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="rounded-lg border border-neutral-200 p-3 text-sm" required />
           <input placeholder="Categoría" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="rounded-lg border border-neutral-200 p-3 text-sm" />
           <input placeholder="Precio" type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className="rounded-lg border border-neutral-200 p-3 text-sm" required />
           <input placeholder="Descripción" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="rounded-lg border border-neutral-200 p-3 text-sm" />
          
           <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Foto del nuevo producto</label>
            <ImageUpload value={newProduct.image_url} onChange={(url) => setNewProduct({ ...newProduct, image_url: url })} />
           </div>

          <button type="submit" disabled={creating} className="rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 sm:col-span-2 transition">
            {creating ? 'Guardando…' : 'Crear producto'}
          </button>
        </form>
      )}

      {status === 'ready' && (
        <div className="grid gap-4">
          {products.map((p) => (
            <div key={p.id} className={`rounded-xl border p-4 transition ${p.available ? 'border-neutral-200 bg-white' : 'border-neutral-100 bg-neutral-100/50 opacity-60'}`}>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 flex-1">
                    
                    {/* --- COLUMNA FOTO MODIFICADA --- */}
                    <div className="relative w-20 h-20 flex-shrink-0 mx-auto sm:mx-0 group">
                         {/* Muestra la foto actual (ya sea la que se está editando o la original) */}
                        {editImageUrl || p.image_url ? (
                            <img src={(editImageUrl || p.image_url) ?? ""} className="w-full h-full rounded-lg object-cover border border-neutral-200" />
                        ) : (
                            <div className="w-full h-full rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                                <span className="text-xs text-neutral-400">Sin foto</span>
                            </div>
                        )}

                        {/* Superposición (Overlay) que solo aparece en modo edición al pasar el mouse */}
                        {editingId === p.id && (
                            <>
                                {/* Capa oscura semitransparente */}
                                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition" onClick={triggerEditUpload}>
                                    {/* Ícono de cámara */}
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </div>
                                {/* Ocultamos el componente ImageUpload original para que no muestre sus botones feos, pero lo necesitamos para la lógica */}
                                <div id={`uploader-${p.id}`} className="hidden">
                                    <ImageUpload value={editImageUrl} onChange={(url) => setEditImageUrl(url)} />
                                </div>
                            </>
                        )}
                    </div>
                    {/* --- FIN COLUMNA FOTO MODIFICADA --- */}

                    <div className="text-center sm:text-left mt-2 sm:mt-0 flex-1 min-w-0">
                        <h3 className="font-bold text-base text-neutral-900 truncate">{p.name}</h3>
                        {p.category && <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full inline-block mt-1 truncate max-w-full">{p.category}</p>}
                        {p.description && <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{p.description}</p>}
                    </div>
                </div>

                <div className="flex items-center justify-center sm:justify-end gap-2 flex-shrink-0 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t border-neutral-100 sm:border-t-0">
                  {editingId === p.id ? (
                    <>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-28 rounded-lg border border-red-300 p-2 text-right font-semibold text-red-600 focus:ring-2 focus:ring-red-100 focus:border-red-500 transition"
                        autoFocus
                        min={1}
                      />
                      <button
                        onClick={() => saveChanges(p.id)} 
                        disabled={savingId === p.id}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-70"
                      >
                        {savingId === p.id ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-neutral-900 tracking-tight min-w-[90px] text-right">
                        {currency.format(p.price)}
                      </span>
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleAvailable(p)}
                        disabled={savingId === p.id}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          p.available
                            ? 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        } disabled:opacity-60`}
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