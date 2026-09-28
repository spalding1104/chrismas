# Sổ Thu Chi

Ứng dụng quản lý thu chi cá nhân theo tháng. Frontend viết bằng **Angular 21** (standalone components, signals, zoneless), backend ở thư mục `server/` (Node.js + Express + PostgreSQL).

## Chạy thử

Cần PostgreSQL đang chạy và đã có database `thu_chi` (`CREATE DATABASE thu_chi;`).

```bash
# 1. Backend – http://localhost:3000
cd server
npm install
cp .env.example .env   # sửa DATABASE_URL nếu user/mật khẩu Postgres khác
npm run dev            # tự tạo bảng khi khởi động, tự restart khi sửa code
npm run db:seed -- ban@email.com   # (tùy chọn) dữ liệu mẫu cho tài khoản đã đăng ký

# 2. Frontend – http://localhost:4200 (terminal khác, ở thư mục gốc)
npm install
npm start              # /api được proxy sang backend (proxy.conf.json)
npm test               # chạy unit test (Vitest)
npm run build          # build production vào dist/
```

Backend chạy thẳng file `.ts` bằng Node ≥ 22.18 (type stripping), không có bước build; `npm run typecheck` để kiểm tra kiểu.

### Tài khoản

- Mở web sẽ gặp trang **Đăng nhập / Đăng ký** (`/dang-nhap`). Mỗi tài khoản chỉ thấy giao dịch của mình.
- **Tài khoản đầu tiên đăng ký** tự nhận toàn bộ giao dịch tạo trước khi có chức năng đăng nhập.
- Mật khẩu tối thiểu 8 ký tự, băm bằng scrypt (có salt riêng). Phiên đăng nhập là cookie `HttpOnly` sống 30 ngày; database chỉ lưu hash của token.
- Sai mật khẩu 10 lần liên tiếp thì email đó bị khóa đăng nhập 15 phút.
- Chưa có chức năng quên mật khẩu / đổi mật khẩu.
- Khi deploy thật, đặt `NODE_ENV=production` để cookie có cờ `Secure` (chỉ gửi qua HTTPS).

### API

Mọi API `/api/transactions` cần đăng nhập (không thì trả 401) và chỉ đọc/ghi dữ liệu của người đang đăng nhập.

| Method | Đường dẫn                      | Mô tả                                    |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/api/auth/register`           | Đăng ký (body: `email, password`), đăng nhập luôn |
| POST   | `/api/auth/login`              | Đăng nhập (body: `email, password`)      |
| POST   | `/api/auth/logout`             | Đăng xuất                                |
| GET    | `/api/auth/me`                 | Người đang đăng nhập                     |
| GET    | `/api/transactions`            | Tất cả giao dịch, mới nhất trước         |
| POST   | `/api/transactions`            | Thêm (body: `type, amount, categoryId, note, date`) |
| PUT    | `/api/transactions/:id`        | Sửa                                      |
| DELETE | `/api/transactions/:id`        | Xóa                                      |
| DELETE | `/api/transactions/sample`     | Xóa các dòng dữ liệu mẫu                 |
| GET    | `/api/cvp-plans`               | Các phương án CVP của tài khoản          |
| POST   | `/api/cvp-plans`               | Thêm phương án                           |
| PUT    | `/api/cvp-plans/:id`           | Sửa phương án                            |
| DELETE | `/api/cvp-plans/:id`           | Xóa phương án                            |
| GET    | `/api/health`                  | Kiểm tra server còn sống (không cần đăng nhập) |

## Đưa lên mạng (Neon + Render)

Một web service duy nhất: Express vừa chạy API vừa phục vụ bản build Angular
(`dist/thu-chi/browser`, nếu thư mục này tồn tại), nên frontend và API chung
domain và cookie đăng nhập hoạt động không cần CORS.

1. **Database**: tạo project trên [neon.tech](https://neon.tech), rồi sao chép
   connection string (dạng `postgres://…?sslmode=require`).
2. **Server**: trên [render.com](https://render.com), chọn **New → Blueprint**
   và chọn repo này. Render đọc `render.yaml` ở gốc repo, với cấu hình
   `rootDir: thu-chi`, build = `npm run build` + cài `server/`, start =
   `npm start --prefix server`.
3. Khi Render hỏi `DATABASE_URL`, dán connection string của Neon vào. Bảng
   được tạo tự động lúc server khởi động.
4. Mở link `https://thu-chi-….onrender.com` và đăng ký tài khoản.

Gói free của Render sẽ tạm ngủ server sau khoảng 15 phút không có truy cập,
nên lần mở đầu tiên sau đó mất chừng 30–60 giây.

## Tính năng

- Chọn tháng, xem **Tổng thu / Tổng chi / Còn lại** và tỷ lệ tiết kiệm
- Thêm, sửa, xóa khoản thu/chi (có nút cộng nhanh +50k, +100k…)
- Danh sách giao dịch nhóm theo ngày, lọc Thu / Chi
- **Biểu đồ danh mục** (chi hoặc thu): thanh cơ cấu 100% và biểu đồ cột ngang so sánh số tiền, có tooltip khi rê chuột
- **Thống kê năm** (tab "Năm", đường dẫn `/nam`): tổng thu/chi cả năm, biểu đồ cột thu – chi 12 tháng, bảng chi tiết từng tháng (bấm để mở tháng đó) và biểu đồ danh mục cả năm
- **Đăng nhập / đăng ký**, mỗi tài khoản có dữ liệu riêng
- **Kế toán quản trị (phân tích CVP)** — công tắc **Chi tiêu | Kế toán** trên header, trang `/ke-toan`:
  - Nhập các phương án (sản phẩm/dự án), lưu theo tài khoản; thêm được 2 ví dụ mẫu bất cứ lúc nào (xưởng sản xuất ghế, quán cà phê theo tháng)
  - Mỗi ô nhập có nút ⓘ giải thích (rê chuột, Tab tới, hoặc chạm trên điện thoại); nội dung ở `features/accounting/field-help.ts`
  - Phân loại chi phí theo cách ứng xử: biến phí (trên mỗi đơn vị) / định phí (cả kỳ)
  - Báo cáo kết quả kinh doanh theo số dư đảm phí (tổng, trên đơn vị, % doanh thu)
  - Điểm hòa vốn (sản lượng, doanh thu), số dư an toàn, đòn bẩy hoạt động (DOL)
  - Sản lượng cần bán cho lợi nhuận mục tiêu trước hoặc sau thuế TNDN
  - Phân tích "nếu… thì…" (đổi % giá, biến phí, định phí, sản lượng) và độ nhạy lợi nhuận
  - Đồ thị hòa vốn có crosshair; mỗi chỉ tiêu kèm công thức
- Lưu vào PostgreSQL qua API; có sẵn lệnh tạo dữ liệu mẫu
- Giao diện sáng/tối: nút trên header xoay vòng **Tự động** (theo hệ điều hành) → **Sáng** → **Tối**, nhớ lựa chọn cho lần sau; dùng tốt trên điện thoại

## Cấu trúc thư mục

```
src/app/
├── core/                      # Logic dùng chung toàn app, không có UI
│   ├── accounting/            # cvp.ts – công thức CVP (hàm thuần, có test)
│   ├── auth/                  # AuthStore, guard, interceptor
│   ├── models/                # Kiểu dữ liệu: Transaction, Category, CvpPlan...
│   ├── constants/             # Danh sách danh mục thu/chi
│   ├── utils/                 # Hàm thuần xử lý ngày/tháng
│   └── state/                 # TransactionStore, CvpStore, ThemeStore (signals)
├── shared/                    # Tái sử dụng được ở bất kỳ feature nào
│   ├── pipes/                 # vnd (định dạng tiền), dayLabel
│   └── ui/                    # Card, StatCard, ProgressBar, EmptyState,
│                              # MonthPicker, YearPicker, SegmentedControl,
│                              # charts/ (BarChart, StackedBar, ColumnChart, LineChart)
├── features/                  # Mỗi tính năng một thư mục
│   ├── spending/              # Khung phân hệ Chi tiêu (thanh Tháng/Năm)
│   ├── dashboard/             # Trang tháng (container) – nối store với UI
│   ├── year-report/           # Trang thống kê năm (container)
│   ├── accounting/            # Phân hệ Kế toán: form phương án, báo cáo, what-if
│   ├── auth/                  # Trang đăng nhập / đăng ký
│   ├── summary/               # SummaryOverview, CategoryChart
│   └── transactions/          # TransactionForm, TransactionList, TransactionItem
├── app.ts                     # Khung trang: header (Chi tiêu | Kế toán), footer
├── app.routes.ts              # '' + 'nam' (Chi tiêu), 'ke-toan', 'dang-nhap'
└── app.config.ts
```

Quy tắc phụ thuộc: `features → shared → core`. `shared` và `core` không import từ `features`.

## Best practice đã áp dụng

- **Standalone components**, không dùng NgModule; `ChangeDetectionStrategy.OnPush` cho mọi component.
- **Signals** cho state: `signal`, `computed`, `effect`, `input()`, `output()`, `model()`; không dùng decorator `@Input/@Output`.
- **Smart / presentational**: chỉ các trang (`DashboardPage`, `YearReportPage`) và khung `App` đọc store; các component còn lại nhận dữ liệu qua input và phát sự kiện qua output, nên dễ dùng lại.
- **Control flow mới** (`@if`, `@for`, `@empty`) và `host` metadata thay cho `@HostBinding`.
- **Typed Reactive Forms** với `NonNullableFormBuilder` và validator.
- `SegmentedControl` vừa hỗ trợ `[(value)]`, vừa là `ControlValueAccessor` để dùng với `formControlName`.
- Barrel file (`index.ts`) làm public API cho `shared/ui`, `shared/pipes` và từng feature.
- **Design system**: mọi giá trị (màu, khoảng cách, bo góc, kích thước, cỡ chữ, hiệu ứng, bóng đổ, z-index) nằm trong `src/styles/_tokens.scss`; các mẫu lặp lại (nút, tab, tooltip, chú thích, breakpoint) là mixin trong `src/app/shared/styles/_mixins.scss`. Component chỉ dùng `var(--…)` và mixin — đổi thiết kế thì sửa token, không phải sửa từng component. `npm run lint:styles` báo lỗi nếu có giá trị viết cứng.
- Unit test cho store, pipe và app shell.

## Mở rộng

- **Thêm danh mục**: sửa `core/constants/categories.ts`. Màu biểu đồ dùng token `--series-1…7` và `--series-other` trong `styles.scss`; thứ tự đã kiểm tra phân biệt được với người mù màu, nên danh mục thứ 8 trở đi hãy dùng `--series-other` thay vì thêm màu mới.
- **Biểu đồ ở trang khác**: `BarChart` / `StackedBar` chỉ nhận `ChartDatum` (`id, label, value, color`), `ColumnChart` nhận `ChartSeries` + `ChartGroup`; không cái nào phụ thuộc nghiệp vụ thu chi.
- **Màu Thu/Chi trong biểu đồ năm** là xanh dương/cam (`--series-1/2`), không phải xanh lá/đỏ như chữ số tiền: cặp xanh lá/đỏ không phân biệt được với người mù màu đỏ-lục (đã kiểm tra, trượt ở giao diện tối).
- **Đổi cấu trúc bảng**: sửa `server/db/schema.sql` (chỉ dùng câu lệnh chạy lại được như `IF NOT EXISTS`, vì server áp dụng file này mỗi lần khởi động), rồi cập nhật `draftSchema` và `COLUMNS` trong `server/src/transactions.ts` cùng model `Transaction` ở frontend.
- **Thêm trang mới**: tạo `features/<ten-trang>/`, khai báo route trong `app.routes.ts`, thêm tab trong `app.ts` và dùng lại các component trong `shared/ui` (xem `year-report/` làm mẫu).
