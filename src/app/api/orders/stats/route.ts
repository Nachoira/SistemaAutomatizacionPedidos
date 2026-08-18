import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

interface StatsRow {
  total_orders: string;
  total_revenue: string;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Los rechazados no cuentan como facturación real.
    const totals = await query<StatsRow>(
      `SELECT COUNT(*)::text AS total_orders, COALESCE(SUM(total), 0)::text AS total_revenue
       FROM orders WHERE status != 'RECHAZADO'`
    );

    const today = await query<StatsRow>(
      `SELECT COUNT(*)::text AS total_orders, COALESCE(SUM(total), 0)::text AS total_revenue
       FROM orders WHERE status != 'RECHAZADO' AND created_at::date = CURRENT_DATE`
    );

    return NextResponse.json({
      totalOrders: Number(totals.rows[0].total_orders),
      totalRevenue: Number(totals.rows[0].total_revenue),
      ordersToday: Number(today.rows[0].total_orders),
      revenueToday: Number(today.rows[0].total_revenue),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json({ error: 'No se pudieron obtener las estadísticas' }, { status: 500 });
  }
}