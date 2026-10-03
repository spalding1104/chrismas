import { Router, type Response } from 'express';
import { z } from 'zod';

import { currentUser } from './auth.ts';
import { pool } from './db.ts';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

// Giữ đồng bộ với RecurringDraft ở frontend (core/models/recurring.model.ts).
const draftSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().int().positive().max(999_999_999),
    categoryId: z.string().trim().min(1).max(50),
    note: z.string().trim().max(80).default(''),
    day: z.number().int().min(1).max(31),
});
const createSchema = draftSchema.extend({ startMonth: monthSchema });
// fromMonth: tháng đang xem — sửa áp dụng từ tháng này trở đi.
const updateSchema = draftSchema.extend({ fromMonth: monthSchema });

const COLUMNS = `id, type, amount, category_id AS "categoryId", note, day,
    start_month AS "startMonth", end_month AS "endMonth"`;

const idSchema = z.uuid();

export const recurringRouter = Router();

// Mọi truy vấn lọc theo user_id. Các thao tác ghi trả về cả danh sách để
// frontend chỉ việc thay thế, khỏi tự tái tạo việc tách/đóng dòng.
recurringRouter.get('/', async (_req, res) => {
    res.json(await listFor(currentUser(res).id));
});

recurringRouter.post('/', async (req, res) => {
    const body = parse(createSchema, req.body, res);
    if (!body) return;
    const userId = currentUser(res).id;
    await pool.query(
        `INSERT INTO recurring_items
             (user_id, type, amount, category_id, note, day, start_month)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            userId,
            body.type,
            body.amount,
            body.categoryId,
            body.note,
            body.day,
            body.startMonth,
        ],
    );
    res.status(201).json(await listFor(userId));
});

recurringRouter.put('/:id', async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return notFound(res);
    const body = parse(updateSchema, req.body, res);
    if (!body) return;
    const userId = currentUser(res).id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query<{
            start_month: string;
            end_month: string | null;
        }>(
            `SELECT start_month, end_month FROM recurring_items
             WHERE id = $1 AND user_id = $2 FOR UPDATE`,
            [id.data, userId],
        );
        const old = rows[0];
        if (!old) {
            await client.query('ROLLBACK');
            return notFound(res);
        }
        const values = [
            body.type,
            body.amount,
            body.categoryId,
            body.note,
            body.day,
        ];
        if (old.start_month < body.fromMonth) {
            // Các tháng trước fromMonth giữ số cũ: đóng dòng cũ ở tháng trước
            // đó, phần từ fromMonth trở đi thành một dòng mới.
            await client.query(
                `UPDATE recurring_items SET end_month = $3
                 WHERE id = $1 AND user_id = $2`,
                [id.data, userId, previousMonth(body.fromMonth)],
            );
            await client.query(
                `INSERT INTO recurring_items (user_id, type, amount,
                     category_id, note, day, start_month, end_month)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, ...values, body.fromMonth, old.end_month],
            );
        } else {
            await client.query(
                `UPDATE recurring_items
                 SET type = $3, amount = $4, category_id = $5, note = $6,
                     day = $7
                 WHERE id = $1 AND user_id = $2`,
                [id.data, userId, ...values],
            );
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
    res.json(await listFor(userId));
});

// ?from=YYYY-MM: ngừng từ tháng đó (các tháng trước giữ nguyên). Không có
// `from`, hoặc khoản bắt đầu từ chính tháng đó trở đi: xóa hẳn.
recurringRouter.delete('/:id', async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return notFound(res);
    const from = monthSchema.optional().safeParse(req.query['from']);
    if (!from.success) {
        res.status(400).json({ error: 'Tháng không hợp lệ' });
        return;
    }
    const userId = currentUser(res).id;
    const { rows } = await pool.query<{ start_month: string }>(
        `SELECT start_month FROM recurring_items
         WHERE id = $1 AND user_id = $2`,
        [id.data, userId],
    );
    if (!rows[0]) return notFound(res);

    if (from.data && rows[0].start_month < from.data) {
        await pool.query(
            `UPDATE recurring_items SET end_month = $3
             WHERE id = $1 AND user_id = $2`,
            [id.data, userId, previousMonth(from.data)],
        );
    } else {
        await pool.query(
            'DELETE FROM recurring_items WHERE id = $1 AND user_id = $2',
            [id.data, userId],
        );
    }
    res.json(await listFor(userId));
});

async function listFor(userId: string): Promise<unknown[]> {
    const { rows } = await pool.query(
        `SELECT ${COLUMNS} FROM recurring_items WHERE user_id = $1
         ORDER BY created_at`,
        [userId],
    );
    return rows;
}

/** "2026-01" → "2025-12". */
export function previousMonth(month: string): string {
    const [y, m] = month.split('-').map(Number) as [number, number];
    const date = new Date(Date.UTC(y, m - 2, 1));
    return date.toISOString().slice(0, 7);
}

function parse<T>(
    schema: z.ZodType<T>,
    body: unknown,
    res: Response,
): T | null {
    const result = schema.safeParse(body);
    if (result.success) return result.data;
    res.status(400).json({
        error: 'Dữ liệu không hợp lệ',
        issues: result.error.issues,
    });
    return null;
}

function notFound(res: Response): void {
    res.status(404).json({ error: 'Không tìm thấy khoản cố định' });
}
