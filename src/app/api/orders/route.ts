import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await query(
      `SELECT * FROM orders ORDER BY created_at DESC`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener los pedidos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los pedidos' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, delivery_person_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del pedido' }, { status: 400 });
    }

    if (status !== undefined) {
      await query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, id]);
    }

    if (delivery_person_id !== undefined) {
      await query(`UPDATE orders SET delivery_person_id = $1 WHERE id = $2`, [delivery_person_id, id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar el pedido:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el pedido' }, { status: 500 });
  }
}