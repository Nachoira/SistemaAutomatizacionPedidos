import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Lista blanca de estados válidos — mantenela sincronizada con
// STATUS_CONFIG del panel de admin. Si el proyecto crece, mové esto
// a un lib/types.ts compartido entre frontend y API routes.
const VALID_STATUSES = ['PENDIENTE', 'TOMADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO'] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const VALID_PAYMENT_METHODS = ['efectivo', 'transferencia'] as const;

interface IncomingItem {
  product_id: number;
  quantity: number;
}

// --- GET -------------------------------------------------------------
// Soporta filtro opcional por estado y un límite, para no traer miles
// de filas de una sola vez a medida que crezca el volumen de pedidos.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500);

    const result = status && VALID_STATUSES.includes(status as OrderStatus)
      ? await query('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC LIMIT $2', [status, limit])
      : await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1', [limit]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los pedidos' }, { status: 500 });
  }
}

// --- POST --------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_name, address, phone, payment_method, items } = body;

    // Validación de campos requeridos
    if (
      typeof customer_name !== 'string' || !customer_name.trim() ||
      typeof address !== 'string' || !address.trim() ||
      typeof phone !== 'string' || !phone.trim()
    ) {
      return NextResponse.json({ error: 'Faltan datos del cliente' }, { status: 400 });
    }

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El pedido no tiene productos' }, { status: 400 });
    }

    const incomingItems = items as IncomingItem[];
    const ids = incomingItems.map((i) => i.product_id);
    if (ids.some((id) => typeof id !== 'number')) {
      return NextResponse.json({ error: 'Productos inválidos' }, { status: 400 });
    }

    // Punto clave: el precio y el total NUNCA se toman del cliente.
    // Se recalculan siempre desde lo que hay guardado en la base.
    const productsResult = await query(
      'SELECT id, name, price FROM products WHERE id = ANY($1::int[])',
      [ids]
    );

    if (productsResult.rows.length !== new Set(ids).size) {
      return NextResponse.json({ error: 'Alguno de los productos ya no existe' }, { status: 400 });
    }

    const priceById = new Map(productsResult.rows.map((p) => [p.id, { name: p.name, price: Number(p.price) }]));

    const resolvedItems = incomingItems.map((i) => {
      const product = priceById.get(i.product_id)!;
      return { name: product.name, quantity: i.quantity, price: product.price };
    });

    const total = resolvedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

    const result = await query(
      `INSERT INTO orders (customer_name, address, phone, payment_method, total, items, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE') RETURNING *`,
      [customer_name.trim(), address.trim(), phone.trim(), payment_method, total, JSON.stringify(resolvedItems)]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
  }
}

// --- PATCH ---------------------------------------------------------------
export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();

    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const result = await query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
  }
}