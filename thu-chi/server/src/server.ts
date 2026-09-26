import express, { type ErrorRequestHandler } from 'express';

import { authRouter, requireAuth } from './auth.ts';
import { cvpPlansRouter } from './cvp-plans.ts';
import { migrate } from './db.ts';
import { transactionsRouter } from './transactions.ts';

const port = Number(process.env['PORT'] ?? 3000);

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/cvp-plans', requireAuth, cvpPlansRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'JSON không hợp lệ' });
        return;
    }
    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
};
app.use(errorHandler);

await migrate();
app.listen(port, () => console.log(`API chạy tại http://localhost:${port}`));
