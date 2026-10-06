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

-- Khoản thu/chi cố định hằng tháng (Spotify, cước điện thoại, lương…).
-- Không sinh dòng trong `transactions`: frontend tự tính ra một khoản cho
-- mỗi tháng trong [start_month, end_month] (end_month NULL = vẫn còn).
-- Sửa/ngừng "từ tháng X" đóng dòng cũ ở tháng trước X (và tạo dòng mới khi
-- sửa) để các tháng đã qua giữ nguyên số liệu — xem src/recurring.ts.
CREATE TABLE IF NOT EXISTS recurring_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('income', 'expense')),
  amount      bigint      NOT NULL CHECK (amount > 0),
  category_id text        NOT NULL,
  note        text        NOT NULL DEFAULT '',
  -- Ngày trong tháng; tháng ngắn hơn thì frontend dồn về ngày cuối tháng.
  day         smallint    NOT NULL CHECK (day BETWEEN 1 AND 31),
  start_month char(7)     NOT NULL,
  end_month   char(7),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurring_items_user_idx
  ON recurring_items (user_id, created_at);

-- Mục tiêu tiết kiệm mỗi tháng. Một dòng ở tháng X áp dụng cho X và các
-- tháng sau, cho tới dòng kế tiếp; amount = 0 nghĩa là bỏ mục tiêu từ tháng
-- đó. Đặt lại ở tháng X xóa các dòng sau X (xem src/savings-goals.ts) nên
-- các tháng trước X giữ nguyên mục tiêu cũ.
CREATE TABLE IF NOT EXISTS savings_goals (
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  month      char(7)     NOT NULL,
  amount     bigint      NOT NULL CHECK (amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);
