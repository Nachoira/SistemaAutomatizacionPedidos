import { Pool, PoolClient, QueryResultRow } from 'pg';

// --- Singleton del pool ----------------------------------------------------
// En desarrollo, Next.js recarga este módulo en cada cambio de archivo (HMR).
// Sin este truco, cada recarga crea un Pool nuevo mientras el anterior sigue
// vivo, y agotás las conexiones disponibles de Neon en minutos.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');

  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error('Error inesperado en el pool de Postgres:', err);
  });

  return pool;
}

const pool = global._pgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}

// --- Query simple ------------------------------------------------------
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`Query lenta (${duration}ms): ${text.slice(0, 100)}`);
    }
    return result;
  } catch (error) {
    console.error('Error en query:', text.slice(0, 100), error);
    throw error;
  }
}

// --- Transacciones -------------------------------------------------------
// Necesario en cuanto una operación toque más de una tabla y deba ser
// atómica — por ejemplo, crear un pedido Y descontar stock a la vez.
// Si una falla, se revierte todo; no queda el pedido creado sin stock
// descontado, o viceversa.
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { pool };