import {
    createHash,
    randomBytes,
    scrypt,
    timingSafeEqual,
    type ScryptOptions,
} from 'node:crypto';
import {
    Router,
    type NextFunction,
    type Request,
    type Response,
} from 'express';
import { z } from 'zod';

import { pool } from './db.ts';

export interface User {
    id: string;
    email: string;
}

const COOKIE_NAME = 'thu_chi_sid';
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

// Chặn dò mật khẩu: sau MAX_FAILURES lần sai liên tiếp của một email,
// khóa đăng nhập email đó trong LOCK_MS. Lưu trong bộ nhớ, mất khi restart.
const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; until: number }>();

// Quên mật khẩu: không gửi email (app một người dùng). Người chủ đặt biến môi
// trường RESET_SECRET; ai biết mã đó mới đặt lại được mật khẩu bất kỳ tài khoản.
// Không đặt (hoặc ngắn hơn MIN_SECRET_LENGTH) thì chức năng tắt hẳn.
const MIN_SECRET_LENGTH = 12;
const rawSecret = process.env['RESET_SECRET'];
const RESET_SECRET =
    rawSecret && rawSecret.length >= MIN_SECRET_LENGTH ? rawSecret : null;
if (rawSecret && !RESET_SECRET) {
    console.warn(
        `RESET_SECRET ngắn hơn ${MIN_SECRET_LENGTH} ký tự nên bị bỏ qua.`,
    );
}
// Đếm chung mọi email: kẻ dò mã có thể đổi email liên tục để né khóa riêng.
let resetFailures = { count: 0, until: 0 };

// ---------- Mật khẩu (scrypt có sẵn trong Node) ----------

const KEY_LENGTH = 64;
const SCRYPT: ScryptOptions = {
    N: 2 ** 15,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 ** 2,
};

function derive(
    password: string,
    salt: Buffer,
    options: ScryptOptions,
): Promise<Buffer> {
    return new Promise((resolve, reject) =>
        scrypt(password, salt, KEY_LENGTH, options, (err, key) =>
            err ? reject(err) : resolve(key),
        ),
    );
}

/** Định dạng lưu: scrypt$N$r$p$salt$hash (base64) — đổi tham số sau vẫn đọc được. */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt, SCRYPT);
    const { N, r, p } = SCRYPT;
    return [
        'scrypt',
        N,
        r,
        p,
        salt.toString('base64'),
        key.toString('base64'),
    ].join('$');
}

async function verifyPassword(
    password: string,
    stored: string,
): Promise<boolean> {
    const [scheme, N, r, p, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    const actual = await derive(password, Buffer.from(salt, 'base64'), {
        N: Number(N),
        r: Number(r),
        p: Number(p),
        maxmem: SCRYPT.maxmem,
    });
    return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
    );
}

// Dùng khi email không tồn tại, để thời gian phản hồi giống như sai mật khẩu.
const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'));

/** Đổi mật khẩu; mọi phiên đăng nhập của tài khoản đều hết hiệu lực. */
export async function setPassword(
    userId: string,
    password: string,
): Promise<string | undefined> {
    const { rows } = await pool.query<{ email: string }>(
        `WITH gone_sessions AS (DELETE FROM sessions WHERE user_id = $1)
         UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING email`,
        [userId, await hashPassword(password)],
    );
    const email = rows[0]?.email;
    if (email) failures.delete(email);
    return email;
}

// ---------- Phiên đăng nhập ----------

const hashToken = (token: string) =>
    createHash('sha256').update(token).digest('hex');

function readToken(req: Request): string | null {
    for (const part of (req.headers.cookie ?? '').split(';')) {
        const [name, ...value] = part.trim().split('=');
        if (name === COOKIE_NAME) return decodeURIComponent(value.join('='));
    }
    return null;
}

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env['NODE_ENV'] === 'production',
    path: '/api',
};

async function startSession(res: Response, user: User): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await pool.query(
        `INSERT INTO sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(days => $3))`,
        [hashToken(token), user.id, SESSION_DAYS],
    );
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MS });
}

/** Chặn request chưa đăng nhập; user hợp lệ nằm ở res.locals (xem currentUser). */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const token = readToken(req);
    if (token) {
        const { rows } = await pool.query<User>(
            `SELECT u.id, u.email FROM sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = $1 AND s.expires_at > now()`,
            [hashToken(token)],
        );
        if (rows[0]) {
            res.locals['user'] = rows[0];
            return next();
        }
    }
    res.status(401).json({ error: 'Chưa đăng nhập' });
}

export function currentUser(res: Response): User {
    return res.locals['user'] as User;
}

// ---------- API ----------

const email = z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email('Email không hợp lệ'));

export const newPassword = z
    .string()
    .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
    .max(200, 'Mật khẩu quá dài');

const registerSchema = z.object({ email, password: newPassword });

// Không lộ quy tắc mật khẩu khi đăng nhập.
const loginSchema = z.object({ email, password: z.string().min(1).max(200) });

const resetSchema = z.object({
    email,
    secret: z.string().min(1).max(200),
    password: newPassword,
});

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
    const input = registerSchema.safeParse(req.body);
    if (!input.success) return invalid(res, input.error);
    const passwordHash = await hashPassword(input.data.password);

    const client = await pool.connect();
    let user: User | undefined;
    try {
        await client.query('BEGIN');
        const inserted = await client.query<User>(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2)
             ON CONFLICT (email) DO NOTHING RETURNING id, email`,
            [input.data.email, passwordHash],
        );
        user = inserted.rows[0];
        if (user) {
            // Tài khoản đầu tiên nhận dữ liệu tạo trước khi có đăng nhập.
            const { rows } = await client.query<{ n: number }>(
                'SELECT count(*)::int AS n FROM users',
            );
            if (rows[0]?.n === 1) {
                await client.query(
                    'UPDATE transactions SET user_id = $1 WHERE user_id IS NULL',
                    [user.id],
                );
            }
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    if (!user) {
        res.status(409).json({ error: 'Email này đã được đăng ký' });
        return;
    }
    await startSession(res, user);
    res.status(201).json(user);
});

authRouter.post('/login', async (req, res) => {
    const input = loginSchema.safeParse(req.body);
    if (!input.success) return invalid(res, input.error);
    const { email, password } = input.data;

    const lock = failures.get(email);
    if (lock && lock.count >= MAX_FAILURES && lock.until > Date.now()) {
        res.status(429).json({
            error: 'Sai quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        });
        return;
    }

    const { rows } = await pool.query<User & { password_hash: string }>(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email],
    );
    const found = rows[0];
    const ok = await verifyPassword(
        password,
        found?.password_hash ?? DUMMY_HASH,
    );
    if (!found || !ok) {
        const count = (lock && lock.until > Date.now() ? lock.count : 0) + 1;
        failures.set(email, { count, until: Date.now() + LOCK_MS });
        res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        return;
    }

    failures.delete(email);
    await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
    const user = { id: found.id, email: found.email };
    await startSession(res, user);
    res.json(user);
});

authRouter.post('/logout', async (req, res) => {
    const token = readToken(req);
    if (token) {
        await pool.query('DELETE FROM sessions WHERE token_hash = $1', [
            hashToken(token),
        ]);
    }
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(204).end();
});

authRouter.get('/me', requireAuth, (_req, res) => {
    res.json(currentUser(res));
});

const sameSecret = (a: string, b: string) =>
    timingSafeEqual(Buffer.from(hashToken(a)), Buffer.from(hashToken(b)));

authRouter.post('/reset-password', async (req, res) => {
    const input = resetSchema.safeParse(req.body);
    if (!input.success) return invalid(res, input.error);
    if (!RESET_SECRET) {
        res.status(503).json({
            error: 'Server chưa đặt RESET_SECRET nên chưa đặt lại mật khẩu được.',
        });
        return;
    }
    if (
        resetFailures.count >= MAX_FAILURES &&
        resetFailures.until > Date.now()
    ) {
        res.status(429).json({
            error: 'Nhập sai mã quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        });
        return;
    }
    if (!sameSecret(input.data.secret, RESET_SECRET)) {
        const count =
            (resetFailures.until > Date.now() ? resetFailures.count : 0) + 1;
        resetFailures = { count, until: Date.now() + LOCK_MS };
        res.status(403).json({ error: 'Mã bí mật không đúng' });
        return;
    }

    const { rows } = await pool.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [input.data.email],
    );
    if (!rows[0]) {
        res.status(404).json({ error: 'Không có tài khoản với email này' });
        return;
    }
    await setPassword(rows[0].id, input.data.password);
    resetFailures = { count: 0, until: 0 };
    res.status(204).end();
});

function invalid(res: Response, error: z.ZodError): void {
    res.status(400).json({
        error: error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
        issues: error.issues,
    });
}
