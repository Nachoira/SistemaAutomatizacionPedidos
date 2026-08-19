import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

interface DeliveryPersonRow {
  id: number;
  name: string;
  active: boolean;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query<DeliveryPersonRow>(
      'SELECT * FROM delivery_people WHERE active = TRUE ORDER BY name'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener deliverys:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los deliverys' }, { status: 500 });
  }
}