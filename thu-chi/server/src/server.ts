import express, { type ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { authRouter, requireAuth } from './auth.ts';
import { cvpPlansRouter } from './cvp-plans.ts';
import { migrate } from './db.ts';
import { recurringRouter } from './recurring.ts';
import { savingsGoalsRouter } from './savings-goals.ts';
import { transactionsRouter } from './transactions.ts';

const port = Number(process.env['PORT'] ?? 3000);

const app = express();
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
app.use('/api/auth', authRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/cvp-plans', requireAuth, cvpPlansRouter);
app.use('/api/recurring', requireAuth, recurringRouter);
app.use('/api/savings-goals', requireAuth, savingsGoalsRouter);
app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Không tìm thấy' });
});

// Khi deploy, cùng một server phục vụ luôn bản build Angular (npm run build
// ở thư mục gốc) — chung domain nên cookie phiên chạy mà không cần CORS.
// Lúc dev không có thư mục này: `ng serve` phục vụ frontend và proxy /api.
const webRoot = fileURLToPath(
    new URL('../../dist/thu-chi/browser', import.meta.url),
);
if (existsSync(webRoot)) {
    app.use(express.static(webRoot, { index: false }));
    // Các route của Angular (/nam, /ke-toan, …) đều trả về index.html.
    app.get('/{*path}', (_req, res) => {
        res.sendFile(path.join(webRoot, 'index.html'));
    });
}

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
