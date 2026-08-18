'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { display, body } from '@/lib/fonts';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Contraseña incorrecta.');
        setLoading(false); // Solo apagamos el loading si falló
        return;
      }

      // Éxito: forzamos recarga completa al panel para que lea bien la cookie
      window.location.href = '/admin';
    } catch {
      setError('No se pudo iniciar sesión. Probá de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className={`${display.variable} ${body.variable} flex min-h-screen items-center justify-center bg-[#f7f5f1] px-5 font-[family-name:var(--font-body)]`}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#e3ddd2] bg-white p-6 shadow-sm"
      >
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#26211a]">
          Panel administrador
        </h1>
        <p className="mt-1 text-sm text-[#7a7264]">Ingresá la contraseña para continuar.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="mt-4 w-full rounded-lg border border-[#e3ddd2] p-2.5 text-[#26211a] outline-none focus:border-[#b5651d] focus:ring-2 focus:ring-[#b5651d]/20"
        />

        {error && <p className="mt-2 text-sm text-[#b23b2e]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-[#b5651d] py-2.5 font-semibold text-white transition-colors hover:bg-[#9c561a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}