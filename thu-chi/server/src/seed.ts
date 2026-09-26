import { migrate, pool } from './db.ts';
import type { TransactionDraft } from './transactions.ts';

/** Dữ liệu mẫu cho tháng hiện tại; giao diện hiện nút "Xóa dữ liệu mẫu" khi còn các dòng này. */
function buildSampleData(monthKey: string): TransactionDraft[] {
    const d = (day: number) => `${monthKey}-${String(day).padStart(2, '0')}`;
    return [
        // { type: 'income', amount: 15_000_000, categoryId: 'salary', note: 'Lương tháng', date: d(1) },
        // {
        //   type: 'income',
        //   amount: 2_500_000,
        //   categoryId: 'side-job',
        //   note: 'Dự án thiết kế',
        //   date: d(12),
        // },
        // { type: 'expense', amount: 4_000_000, categoryId: 'housing', note: 'Tiền nhà', date: d(2) },
        // {
        //   type: 'expense',
        //   amount: 650_000,
        //   categoryId: 'housing',
        //   note: 'Điện nước, internet',
        //   date: d(5),
        // },
        // {
        //   type: 'expense',
        //   amount: 85_000,
        //   categoryId: 'food',
        //   note: 'Ăn trưa với đồng nghiệp',
        //   date: d(3),
        // },
        // { type: 'expense', amount: 1_200_000, categoryId: 'food', note: 'Đi chợ cả tuần', date: d(7) },
        // { type: 'expense', amount: 320_000, categoryId: 'transport', note: 'Đổ xăng', date: d(8) },
        // { type: 'expense', amount: 890_000, categoryId: 'shopping', note: 'Giày chạy bộ', date: d(10) },
        // {
        //   type: 'expense',
        //   amount: 240_000,
        //   categoryId: 'entertainment',
        //   note: 'Xem phim cuối tuần',
        //   date: d(14),
        // },
        // {
        //   type: 'expense',
        //   amount: 450_000,
        //   categoryId: 'education',
        //   note: 'Khóa học tiếng Anh online',
        //   date: d(15),
        // },
    ];
}

const now = new Date();
const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const samples = buildSampleData(monthKey);

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
    console.error('Cách dùng: npm run db:seed -- <email tài khoản>');
    process.exit(1);
}

await migrate();
const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email],
);
const userId = rows[0]?.id;
if (!userId) {
    console.error(`Không có tài khoản ${email}. Hãy đăng ký trên web trước.`);
    await pool.end();
    process.exit(1);
}

const client = await pool.connect();
try {
    await client.query('BEGIN');
    await client.query(
        'DELETE FROM transactions WHERE user_id = $1 AND is_sample',
        [userId],
    );
    for (const t of samples) {
        await client.query(
            `INSERT INTO transactions
                 (user_id, type, amount, category_id, note, date, is_sample)
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [userId, t.type, t.amount, t.categoryId, t.note, t.date],
        );
    }
    await client.query('COMMIT');
    console.log(
        `Đã thêm ${samples.length} giao dịch mẫu tháng ${monthKey} cho ${email}.`,
    );
} catch (err) {
    await client.query('ROLLBACK');
    throw err;
} finally {
    client.release();
    await pool.end();
}
