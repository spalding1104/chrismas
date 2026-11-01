import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { newPassword, setPassword } from './auth.ts';
import { migrate, pool } from './db.ts';

// Đặt lại mật khẩu ngay trên database, dùng khi chưa cấu hình gửi email.
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
    console.error('Cách dùng: npm run db:reset-password -- <email tài khoản>');
    process.exit(1);
}

await migrate();
const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email],
);
const userId = rows[0]?.id;
if (!userId) {
    console.error(`Không có tài khoản ${email} trong database này.`);
    await pool.end();
    process.exit(1);
}

// Hỏi trong lúc chạy, không nhận qua tham số, để mật khẩu không nằm trong
// lịch sử lệnh của shell.
const prompt = createInterface({ input: stdin, output: stdout });
const password = newPassword.safeParse(await prompt.question('Mật khẩu mới: '));
prompt.close();
if (!password.success) {
    console.error(password.error.issues[0]?.message);
    await pool.end();
    process.exit(1);
}

await setPassword(userId, password.data);
await pool.end();
console.log(`Đã đổi mật khẩu cho ${email} và đăng xuất mọi thiết bị.`);
