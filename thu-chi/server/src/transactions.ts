import { Router, type Response } from 'express';
import { z } from 'zod';

import { currentUser } from './auth.ts';
import { pool } from './db.ts';

export const draftSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    categoryId: z.string().trim().min(1).max(50),
    note: z.string().trim().max(80).default(''),
    date: z.iso.date(),
});

export type TransactionDraft = z.infer<typeof draftSchema>;

// Trả date dạng chuỗi yyyy-MM-dd: để pg tự chuyển sang Date sẽ bị
// lệch ngày theo múi giờ.
const COLUMNS = `id, type, amount, category_id AS "categoryId", note,
    to_char(date, 'YYYY-MM-DD') AS date, is_sample AS "isSample"`;

const idSchema = z.uuid();

export const transactionsRouter = Router();

// Mọi truy vấn đều lọc theo user_id của người đang đăng nhập.
transactionsRouter.get('/', async (_req, res) => {
    const { rows } = await pool.query(
        `SELECT ${COLUMNS} FROM transactions WHERE user_id = $1
         ORDER BY date DESC, created_at DESC`,
        [currentUser(res).id],
    );
    res.json(rows);
});

transactionsRouter.post('/', async (req, res) => {
    const draft = parseDraft(req.body, res);
    if (!draft) return;
    const { rows } = await pool.query(
        `INSERT INTO transactions
             (user_id, type, amount, category_id, note, date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
        [
            currentUser(res).id,
            draft.type,
            draft.amount,
            draft.categoryId,
            draft.note,
            draft.date,
        ],
    );
    res.status(201).json(rows[0]);
});

// Khai báo trước '/:id' để "sample" không bị hiểu là một id.
transactionsRouter.delete('/sample', async (_req, res) => {
    await pool.query(
        'DELETE FROM transactions WHERE user_id = $1 AND is_sample',
        [currentUser(res).id],
    );
    res.status(204).end();
});

transactionsRouter.put('/:id', async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return notFound(res);
    const draft = parseDraft(req.body, res);
    if (!draft) return;
    const { rows } = await pool.query(
        `UPDATE transactions
         SET type = $2, amount = $3, category_id = $4, note = $5,
             date = $6, is_sample = false
         WHERE id = $1 AND user_id = $7 RETURNING ${COLUMNS}`,
        [
            id.data,
            draft.type,
            draft.amount,
            draft.categoryId,
            draft.note,
            draft.date,
            currentUser(res).id,
        ],
    );
    if (!rows[0]) return notFound(res);
    res.json(rows[0]);
});

transactionsRouter.delete('/:id', async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return notFound(res);
    const { rowCount } = await pool.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
        [id.data, currentUser(res).id],
    );
    if (!rowCount) return notFound(res);
    res.status(204).end();
});

function parseDraft(body: unknown, res: Response): TransactionDraft | null {
    const result = draftSchema.safeParse(body);
    if (result.success) return result.data;
    res.status(400).json({
        error: 'Dữ liệu không hợp lệ',
        issues: result.error.issues,
    });
    return null;
}

function notFound(res: Response): void {
    res.status(404).json({ error: 'Không tìm thấy giao dịch' });
}
