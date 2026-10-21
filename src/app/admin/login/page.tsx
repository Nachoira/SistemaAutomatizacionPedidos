'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { display, body } from '@/lib/fonts';

const BAR_NAME = process.env.NEXT_PUBLIC_BAR_NAME || 'Mi Bar';

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
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('No se pudo iniciar sesión. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${display.variable} ${body.variable} flex min-h-screen items-center justify-center bg-[#f4f7fd] px-5 font-[family-name:var(--font-body)]`}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#dbe3f0] bg-white p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1d4ed8]">{BAR_NAME}</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[#0f1f3d]">
          Panel administrador
        </h1>
        <p className="mt-1 text-sm text-[#5b6b86]">Ingresá la contraseña para continuar.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="mt-4 w-full rounded-lg border border-[#dbe3f0] p-2.5 text-[#0f1f3d] outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
        />

        {error && <p className="mt-2 text-sm text-[#dc2626]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-[#1d4ed8] py-2.5 font-semibold text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}