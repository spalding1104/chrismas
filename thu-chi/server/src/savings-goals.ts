import { Router } from 'express';
import { z } from 'zod';

import { currentUser } from './auth.ts';
import { pool } from './db.ts';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
// Giữ đồng bộ với frontend (core/models/savings-goal.model.ts). 0 = bỏ mục
// tiêu từ tháng đó trở đi.
const bodySchema = z.object({
    amount: z.number().int().min(0).max(999_999_999),
});

export const savingsGoalsRouter = Router();

savingsGoalsRouter.get('/', async (_req, res) => {
    res.json(await listFor(currentUser(res).id));
});

// Đặt mục tiêu từ tháng :month trở đi: xóa các dòng sau tháng đó rồi ghi
// (hoặc ghi đè) dòng của tháng đó. Các tháng trước giữ nguyên.
savingsGoalsRouter.put('/:month', async (req, res) => {
    const month = monthSchema.safeParse(req.params.month);
    if (!month.success) {
        res.status(400).json({ error: 'Tháng không hợp lệ' });
        return;
    }
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
        res.status(400).json({
            error: 'Dữ liệu không hợp lệ',
            issues: body.error.issues,
        });
        return;
    }
    const userId = currentUser(res).id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'DELETE FROM savings_goals WHERE user_id = $1 AND month > $2',
            [userId, month.data],
        );
        await client.query(
            `INSERT INTO savings_goals (user_id, month, amount)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, month)
             DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()`,
            [userId, month.data, body.data.amount],
        );
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
    res.json(await listFor(userId));
});

async function listFor(userId: string): Promise<unknown[]> {
    const { rows } = await pool.query(
        `SELECT month, amount FROM savings_goals WHERE user_id = $1
         ORDER BY month`,
        [userId],
    );
    return rows;
}
