import { Bricolage_Grotesque, Inter } from 'next/font/google';

export const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});