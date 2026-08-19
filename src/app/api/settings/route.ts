import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

interface SettingsRow {
  id: number;
  delivery_price: string;
  payment_date: string | null;
  due_date: string | null;
  updated_at: string;
}

// GET es público: el menú del cliente necesita saber el precio del delivery.
// El vencimiento (payment_date/due_date) sí viaja en la respuesta, pero no
// se muestra en el ClientMenu — solo lo lee el admin. No es información
// sensible como para esconderla detrás de auth.
export async function GET() {
  try {
    const result = await query<SettingsRow>('SELECT * FROM settings ORDER BY id LIMIT 1');
    return NextResponse.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json({ error: 'No se pudo obtener la configuración' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (typeof body.delivery_price === 'number' && body.delivery_price >= 0) {
      fields.push(`delivery_price = $${i++}`);
      values.push(body.delivery_price);
    }
    if (typeof body.payment_date === 'string' || body.payment_date === null) {
      fields.push(`payment_date = $${i++}`);
      values.push(body.payment_date);
    }
    if (typeof body.due_date === 'string' || body.due_date === null) {
      fields.push(`due_date = $${i++}`);
      values.push(body.due_date);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query<SettingsRow>(
      `UPDATE settings SET ${fields.join(', ')} WHERE id = (SELECT id FROM settings ORDER BY id LIMIT 1) RETURNING *`,
      values
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}