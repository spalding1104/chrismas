# Sổ Thu Chi

Ứng dụng quản lý thu chi cá nhân theo tháng, viết bằng **Angular 21** (standalone components, signals, zoneless).

## Chạy thử

```bash
npm install
npm start          # http://localhost:4200
npm test           # chạy unit test (Vitest)
npm run build      # build production vào dist/
```

## Tính năng

- Chọn tháng, xem **Tổng thu / Tổng chi / Còn lại** và tỷ lệ tiết kiệm
- Thêm, sửa, xóa khoản thu/chi (có nút cộng nhanh +50k, +100k…)
- Danh sách giao dịch nhóm theo ngày, lọc Thu / Chi
- **Biểu đồ danh mục** (chi hoặc thu): thanh cơ cấu 100% và biểu đồ cột ngang so sánh số tiền, có tooltip khi rê chuột
- Lưu tự động vào `localStorage`; có dữ liệu mẫu ở lần mở đầu
- Hỗ trợ giao diện sáng/tối theo hệ thống, dùng tốt trên điện thoại

## Cấu trúc thư mục

```
src/app/
├── core/                      # Logic dùng chung toàn app, không có UI
│   ├── models/                # Kiểu dữ liệu: Transaction, Category...
│   ├── constants/             # Danh sách danh mục thu/chi
│   ├── utils/                 # Hàm thuần xử lý ngày/tháng
│   ├── services/              # LocalStorageService
│   └── state/                 # TransactionStore (signals) – nguồn dữ liệu duy nhất
├── shared/                    # Tái sử dụng được ở bất kỳ feature nào
│   ├── pipes/                 # vnd (định dạng tiền), dayLabel
│   └── ui/                    # Card, StatCard, ProgressBar, EmptyState,
│                              # MonthPicker, SegmentedControl,
│                              # charts/ (BarChart, StackedBar – nhận ChartDatum chung)
├── features/                  # Mỗi tính năng một thư mục
│   ├── dashboard/             # Trang chính (container) – nối store với UI
│   ├── summary/               # SummaryOverview, CategoryChart
│   └── transactions/          # TransactionForm, TransactionList, TransactionItem
├── app.ts                     # Khung trang: header + chọn tháng
└── app.config.ts
```

Quy tắc phụ thuộc: `features → shared → core`. `shared` và `core` không import từ `features`.

## Best practice đã áp dụng

- **Standalone components**, không dùng NgModule; `ChangeDetectionStrategy.OnPush` cho mọi component.
- **Signals** cho state: `signal`, `computed`, `effect`, `input()`, `output()`, `model()`; không dùng decorator `@Input/@Output`.
- **Smart / presentational**: chỉ `DashboardPage` đọc store; các component còn lại nhận dữ liệu qua input và phát sự kiện qua output, nên dễ dùng lại.
- **Control flow mới** (`@if`, `@for`, `@empty`) và `host` metadata thay cho `@HostBinding`.
- **Typed Reactive Forms** với `NonNullableFormBuilder` và validator.
- `SegmentedControl` vừa hỗ trợ `[(value)]`, vừa là `ControlValueAccessor` để dùng với `formControlName`.
- Barrel file (`index.ts`) làm public API cho `shared/ui`, `shared/pipes` và từng feature.
- Design tokens (màu, khoảng cách, bo góc) đặt tập trung trong `src/styles.scss`, component chỉ dùng biến CSS.
- Unit test cho store, pipe và app shell.

## Mở rộng

- **Thêm danh mục**: sửa `core/constants/categories.ts`. Màu biểu đồ dùng token `--series-1…7` và `--series-other` trong `styles.scss`; thứ tự đã kiểm tra phân biệt được với người mù màu, nên danh mục thứ 8 trở đi hãy dùng `--series-other` thay vì thêm màu mới.
- **Biểu đồ ở trang khác**: `BarChart` / `StackedBar` chỉ nhận `ChartDatum` (`id, label, value, color`), không phụ thuộc nghiệp vụ thu chi.
- **Đổi nơi lưu dữ liệu** (API, IndexedDB…): chỉ cần thay `LocalStorageService` / phần `hydrate` trong `TransactionStore`, UI giữ nguyên.
- **Thêm trang mới** (ví dụ báo cáo năm): tạo `features/<ten-trang>/` và dùng lại các component trong `shared/ui`.
