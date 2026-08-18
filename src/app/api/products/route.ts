import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

interface ProductRow {
  id: number;
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  available: boolean;
}

// --- GET -------------------------------------------------------------
// Público (lo usa el menú del cliente) — por default solo trae
// disponibles. El admin pasa ?all=true para ver también los ocultos,
// pero eso requiere sesión: sin login, ?all=true se ignora.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wantsAll = searchParams.get('all') === 'true';
    const canSeeAll = wantsAll && (await isAdminAuthenticated());

    const result = canSeeAll
      ? await query<ProductRow>('SELECT * FROM products ORDER BY category, name')
      : await query<ProductRow>('SELECT * FROM products WHERE available = TRUE ORDER BY category, name');

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los productos' }, { status: 500 });
  }
}

// --- POST --------------------------------------------------------------
// Admin: alta de producto nuevo.
export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { name, description, price, category } = await req.json();

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    }

    const result = await query<ProductRow>(
      `INSERT INTO products (name, description, price, category, available)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
      [name.trim(), description || null, price, category || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}

// --- PATCH ---------------------------------------------------------------
// Admin: editar precio, disponibilidad, nombre, etc. Solo actualiza
// los campos que vengan en el body.
export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (typeof body.name === 'string' && body.name.trim()) {
      fields.push(`name = $${i++}`);
      values.push(body.name.trim());
    }
    if (typeof body.description === 'string') {
      fields.push(`description = $${i++}`);
      values.push(body.description);
    }
    if (typeof body.price === 'number' && body.price > 0) {
      fields.push(`price = $${i++}`);
      values.push(body.price);
    }
    if (typeof body.category === 'string') {
      fields.push(`category = $${i++}`);
      values.push(body.category);
    }
    if (typeof body.available === 'boolean') {
      fields.push(`available = $${i++}`);
      values.push(body.available);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    values.push(id);
    const result = await query<ProductRow>(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}