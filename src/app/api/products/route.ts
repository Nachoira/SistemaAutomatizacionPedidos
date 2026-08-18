import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM products WHERE available = TRUE');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error al cargar productos' }, { status: 500 });
  }
}