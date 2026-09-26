import { readFile } from 'node:fs/promises';
import pg from 'pg';

// bigint mặc định trả về string; số tiền VND luôn nằm trong giới hạn
// an toàn của Number.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
    throw new Error(
        'Thiếu DATABASE_URL. Sao chép .env.example thành .env ' +
            'rồi điền thông tin Postgres.',
    );
}

export const pool = new pg.Pool({ connectionString });

export async function migrate(): Promise<void> {
    const sql = await readFile(
        new URL('../db/schema.sql', import.meta.url),
        'utf8',
    );
    await pool.query(sql);
}
