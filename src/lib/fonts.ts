import { Bricolage_Grotesque, Inter } from 'next/font/google';

// Centralizado para que cada página de /admin use la misma instancia,
// en vez de llamar next/font/google en cada archivo por separado.
export const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
});

export const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});