-- Chạy lại nhiều lần vẫn an toàn: server tự áp dụng file này mỗi lần khởi động.
-- Chỉ dùng câu lệnh idempotent (IF NOT EXISTS...).

CREATE TABLE IF NOT EXISTS users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Luôn lưu chữ thường (chuẩn hóa ở tầng API).
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Chỉ lưu hash SHA-256 của token phiên; token gốc chỉ nằm trong cookie.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text        PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text        NOT NULL CHECK (type IN ('income', 'expense')),
  amount      bigint      NOT NULL CHECK (amount > 0),
  category_id text        NOT NULL,
  note        text        NOT NULL DEFAULT '',
  date        date        NOT NULL,
  is_sample   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Dữ liệu tạo trước khi có tài khoản mang user_id NULL và không ai thấy,
-- cho tới khi tài khoản đầu tiên đăng ký nhận về (xem auth.ts).
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users (id) ON DELETE CASCADE;

DROP INDEX IF EXISTS transactions_date_idx;
CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON transactions (user_id, date DESC);

-- Phương án phân tích CVP (kế toán quản trị) của từng tài khoản.
-- Số liệu nhập (giá bán, sản lượng, các khoản chi phí…) nằm trong `data`,
-- được kiểm tra bằng zod ở src/cvp-plans.ts.
CREATE TABLE IF NOT EXISTS cvp_plans (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       text        NOT NULL,
  data       jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cvp_plans_user_idx
  ON cvp_plans (user_id, created_at);
