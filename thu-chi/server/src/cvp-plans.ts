import { Router, type Response } from 'express';
import { z } from 'zod';

import { currentUser } from './auth.ts';
import { pool } from './db.ts';

const money = z.number().finite().min(0).max(1e15);

// Khớp với CvpPlanInput ở frontend (src/app/core/models/cvp-plan.model.ts).
const planSchema = z.object({
    name: z.string().trim().min(1, 'Nhập tên phương án').max(80),
    unitLabel: z.string().trim().min(1).max(20).default('sp'),
    unitPrice: money,
    volume: money,
    taxRate: z.number().finite().min(0).max(100),
    targetProfit: money.nullable(),
    targetAfterTax: z.boolean(),
    costItems: z
        .array(
            z.object({
                id: z.string().min(1).max(40),
                name: z.string().trim().max(80),
                behavior: z.enum(['variable', 'fixed']),
                amount: money,
            }),
        )
        .max(50),
});

type PlanInput = z.infer<typeof planSchema>;

const COLUMNS = `id, name, data, updated_at AS "updatedAt"`;

interface Row {
    id: string;
    name: string;
    data: Omit<PlanInput, 'name'>;
    /** Date → JSON thành chuỗi ISO (UTC). */
    updatedAt: Date;
}

const toPlan = ({ data, ...row }: Row) => ({ ...row, ...data });

const idSchema = z.uuid();

export const cvpPlansRouter = Router();

// Mọi truy vấn đều lọc theo user_id của người đang đăng nhập.
cvpPlansRouter.get('/', async (_req, res) => {
    const { rows } = await pool.query<Row>(
        `SELECT ${COLUMNS} FROM cvp_plans WHERE user_id = $1
         ORDER BY created_at`,
        [currentUser(res).id],
    );
    res.json(rows.map(toPlan));
});

cvpPlansRouter.post('/', async (req, res) => {
    const input = parse(req.body, res);
    if (!input) return;
    const { name, ...data } = input;
    const { rows } = await pool.query<Row>(
        `INSERT INTO cvp_plans (user_id, name, data)
         VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
        [currentUser(res).id, name, data],
    );
    res.status(201).json(toPlan(rows[0]!));
});

cvpPlansRouter.put('/:id', async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return notFound(res);
    const input = parse(req.body, res);
    if (!input) return;
    const { name, ...data } = input;
    const { rows } = await pool.query<Row>(
        `UPDATE cvp_plans SET name = $2, data = $3, updated_at = now()
         WHERE id = $1 AND user_id = $4 RETURNING ${COLUMNS}`,
        [id.data, name, data, currentUser(res).id],
    );
    if (!rows[0]) return notFound(res);
    res.json(toPlan(rows[0]));
});

cvpPlansRouter.delete('/:id', async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return notFound(res);
    const { rowCount } = await pool.query(
        'DELETE FROM cvp_plans WHERE id = $1 AND user_id = $2',
        [id.data, currentUser(res).id],
    );
    if (!rowCount) return notFound(res);
    res.status(204).end();
});

function parse(body: unknown, res: Response): PlanInput | null {
    const result = planSchema.safeParse(body);
    if (result.success) return result.data;
    res.status(400).json({
        error: result.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
        issues: result.error.issues,
    });
    return null;
}

function notFound(res: Response): void {
    res.status(404).json({ error: 'Không tìm thấy phương án' });
}
