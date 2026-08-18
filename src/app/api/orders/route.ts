import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

const VALID_STATUSES = ['PENDIENTE', 'TOMADO', 'EN_CAMINO', 'ENTREGADO', 'RECHAZADO'] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const VALID_PAYMENT_METHODS = ['efectivo', 'transferencia'] as const;
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

interface IncomingItem {
  product_id: number;
  quantity: number;
}

interface ProductRow {
  id: number;
  name: string;
  price: string;
}

interface OrderRow {
  id: number;
  customer_name: string;
  address: string;
  phone: string;
  payment_method: string;
  total: string;
  status: OrderStatus;
  items: unknown;
  created_at: string;
  updated_at: string;
}

function isValidStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}

function isValidPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (VALID_PAYMENT_METHODS as readonly string[]).includes(value);
}

// --- GET -------------------------------------------------------------
// Solo el admin ve la lista de pedidos.
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500);

    const result = isValidStatus(statusParam)
      ? await query<OrderRow>('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC LIMIT $2', [statusParam, limit])
      : await query<OrderRow>('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1', [limit]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return NextResponse.json({ error: 'No se pudieron obtener los pedidos' }, { status: 500 });
  }
}

// --- POST --------------------------------------------------------------
// Público — lo llama el cliente desde el menú. Crea el pedido y, en la
// misma transacción, da de alta o actualiza el registro del cliente
// (por teléfono) para que el apartado de "Clientes" del admin tenga
// siempre datos consistentes con los pedidos reales.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_name, address, phone, payment_method, items } = body;

    if (
      typeof customer_name !== 'string' || !customer_name.trim() ||
      typeof address !== 'string' || !address.trim() ||
      typeof phone !== 'string' || !phone.trim()
    ) {
      return NextResponse.json({ error: 'Faltan datos del cliente' }, { status: 400 });
    }

    if (!isValidPaymentMethod(payment_method)) {
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

    const productsResult = await query<ProductRow>(
      'SELECT id, name, price FROM products WHERE id = ANY($1::int[])',
      [ids]
    );

    if (productsResult.rows.length !== new Set(ids).size) {
      return NextResponse.json({ error: 'Alguno de los productos ya no existe' }, { status: 400 });
    }

    const priceById = new Map(
      productsResult.rows.map((p) => [p.id, { name: p.name, price: Number(p.price) }])
    );

    const resolvedItems = incomingItems.map((i) => {
      const product = priceById.get(i.product_id)!;
      return { name: product.name, quantity: i.quantity, price: product.price };
    });

    const total = resolvedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const cleanName = customer_name.trim();
    const cleanAddress = address.trim();
    const cleanPhone = phone.trim();

    const order = await transaction(async (client) => {
      const orderResult = await client.query<OrderRow>(
        `INSERT INTO orders (customer_name, address, phone, payment_method, total, items, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE') RETURNING *`,
        [cleanName, cleanAddress, cleanPhone, payment_method, total, JSON.stringify(resolvedItems)]
      );

      await client.query(
        `INSERT INTO customers (phone, name, address, total_orders, total_spent, last_order_at)
         VALUES ($1, $2, $3, 1, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (phone) DO UPDATE SET
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           total_orders = customers.total_orders + 1,
           total_spent = customers.total_spent + EXCLUDED.total_spent,
           last_order_at = CURRENT_TIMESTAMP`,
        [cleanPhone, cleanName, cleanAddress, total]
      );

      return orderResult.rows[0];
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error al crear pedido:', error);
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
  }
}

// --- PATCH ---------------------------------------------------------------
// Solo el admin cambia estados.
export async function PATCH(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
    }
    if (!isValidStatus(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const result = await query<OrderRow>(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
  }
}