import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

interface CustomerRow {
  id: number;
  phone: string;
  name: string;
  address: string | null;
  total_orders: number;
  total_spent: string;
  first_order_at: string;
  last_order_at: string;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query<CustomerRow>(
      'SELECT * FROM customers ORDER BY total_spent DESC'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los clientes' }, { status: 500 });
  }
}