# Sổ Thu Chi — Danh sách chức năng

Tổng hợp các chức năng đã làm, mỗi mục có chú thích: dùng để làm gì, dùng
thế nào, tính ra sao và code nằm ở đâu.

Ứng dụng có 3 trang chính: **Tháng** (`/`), **Năm** (`/nam`) và **Kế toán**
(`/ke-toan`). Muốn vào phải đăng nhập (`/dang-nhap`).

---

## 1. Tài khoản

### 1.1. Đăng ký / Đăng nhập / Đăng xuất

- **Chức năng:** mỗi người có sổ riêng, không ai xem được dữ liệu của người
  khác.
- **Cách dùng:** trang `/dang-nhap` có một form chung, bấm nút chuyển để đổi
  giữa **Đăng nhập** và **Đăng ký**. Khi đăng ký, mật khẩu phải có ít nhất 8 ký
  tự và phải nhập lại cho khớp. Email tài khoản và nút **Đăng xuất** nằm ở góc
  phải trên cùng.
- **Chú thích:**
  - Phiên đăng nhập lưu trong cookie HttpOnly, nên trình duyệt không đọc được
    token. Mật khẩu được mã hóa bằng scrypt.
  - Nhập sai mật khẩu 10 lần thì tài khoản bị khóa đăng nhập 15 phút.
  - Hết phiên (lỗi 401) thì ứng dụng tự quay về trang đăng nhập.
  - Tài khoản **đầu tiên** đăng ký sẽ nhận toàn bộ dữ liệu cũ có từ trước khi
    ứng dụng có chức năng tài khoản.
- **Code:** `src/app/core/auth/`, `src/app/features/auth/`,
  `server/src/auth.ts`

---

## 2. Trang Tháng (trang chính `/`)

### 2.1. Chọn tháng

- **Chức năng:** xem số liệu của từng tháng.
- **Cách dùng:** trên thanh công cụ, bấm **‹ ›** để lùi hoặc tiến một tháng.
  Bấm vào tên tháng để mở bảng chọn 12 tháng. Bảng tự đóng khi chọn xong, khi
  bấm Esc hoặc khi bấm ra ngoài.
- **Code:** `src/app/shared/ui/month-picker/`,
  `src/app/features/spending/spending-layout.ts`

### 2.2. Thống kê nhanh: Tổng thu · Tổng chi · Còn lại

- **Chức năng:** 3 ô số liệu ở đầu trang.
- **Cách tính:**
  - **Tổng thu / Tổng chi:** cộng các giao dịch của tháng, **tính cả khoản cố
    định**. Dòng nhỏ bên dưới cho biết có bao nhiêu khoản.
  - **Còn lại** = Tổng thu − Tổng chi. Số dương màu xanh, số âm màu đỏ.
- **Chú thích:** dòng nhỏ dưới ô Còn lại cho biết "Tiết kiệm được X% thu
  nhập", hoặc "Chi vượt thu X%" nếu chi nhiều hơn thu.
- **Code:** `src/app/features/summary/summary-overview/`

### 2.3. Mục tiêu tiết kiệm & hạn mức chi tiêu ⭐ (mới)

- **Chức năng:** đặt số tiền muốn tiết kiệm mỗi tháng, rồi xem tháng này còn
  được tiêu bao nhiêu mà vẫn đạt mục tiêu.
- **Cách dùng:**
  - Bấm **Đặt mục tiêu tiết kiệm**, nhập số tiền rồi bấm **Lưu mục tiêu**.
    Form có nút gợi ý **10% / 20% / 30% thu nhập** của tháng (làm tròn tới
    10.000đ).
  - Bấm **Sửa mục tiêu** để đổi số tiền. Bấm **Bỏ mục tiêu** để không đặt mục
    tiêu nữa.
- **Cách tính:**

  | Chỉ số | Công thức |
  |---|---|
  | Muốn tiết kiệm | Mục tiêu đang áp dụng cho tháng |
  | **Được tiêu trong tháng** | Tổng thu − Tiết kiệm − **Chi cố định** |
  | Đã tiêu | Tổng chi − Chi cố định (chỉ tính các khoản chi tự do) |
  | **Còn được tiêu** | Được tiêu − Đã tiêu (âm thì hiện "Đã tiêu lố") |
  | Mỗi ngày | Còn được tiêu ÷ số ngày còn lại (tính cả hôm nay, làm tròn xuống) |

  Ví dụ: thu 15tr, tiết kiệm 5tr, cố định 5.033.000, đã tiêu 1,2tr. Được tiêu
  là 4.967.000, còn được tiêu 3.767.000, khoảng 139.518 đ/ngày cho 27 ngày còn
  lại.
- **Hiển thị thêm:**
  - Thanh tiến độ "Đã tiêu … / … (x%)". Thanh màu xanh dương, chuyển sang màu
    đỏ khi tiêu lố.
  - Dòng trạng thái, một trong các trường hợp: đúng kế hoạch; đã tiêu lố (thiếu
    bao nhiêu so với mục tiêu); thu nhập chưa đủ cho mục tiêu và khoản cố định;
    tháng chưa có khoản thu; tháng đã qua và đạt mục tiêu.
- **Chú thích:**
  - Mục tiêu áp dụng **từ tháng đang xem trở đi**, các tháng trước giữ mục
    tiêu cũ. "Bỏ mục tiêu" cũng chỉ áp dụng từ tháng đó.
  - Chỉ các khoản nhập ở card **Khoản cố định hằng tháng** mới bị trừ trước
    vào hạn mức. Nhập lương vào Khoản cố định thì hạn mức có ngay từ đầu
    tháng.
  - Tháng tương lai được tính đủ số ngày của tháng. Tháng đã qua thì không
    tính mức mỗi ngày.
- **Code:** `src/app/features/savings/`, `src/app/core/state/savings.store.ts`,
  `src/app/core/utils/budget.util.ts`, `server/src/savings-goals.ts`
  (bảng `savings_goals`)

### 2.4. Thêm / Sửa / Xóa giao dịch

- **Chức năng:** ghi lại một khoản thu hoặc chi.
- **Cách dùng:**
  - Chọn **Thu** hoặc **Chi**, nhập số tiền, chọn danh mục, ngày và ghi chú
    (không bắt buộc).
  - Ngày mặc định là hôm nay nếu đang xem tháng hiện tại, còn lại là ngày 1
    của tháng đang xem.
  - Muốn sửa một giao dịch thì bấm **Sửa** ở danh sách: form chuyển thành "Sửa
    giao dịch" và giao dịch đó được tô đậm. Bấm **Xóa** để xóa.
- **Nhập số tiền nhanh:**
  - Ô số tiền tự thêm dấu chấm ngăn cách hàng nghìn khi gõ (`50.000`). Dấu
    phẩy dùng cho phần thập phân, gõ dấu chấm sẽ tự đổi thành dấu phẩy.
  - Có bàn phím số 1–0, nút xóa chữ số cuối, nút cộng nhanh **+50k / +100k /
    +200k** và nút thêm **000 / 0000**.
  - Tối đa 9 chữ số (999.999.999đ).
- **Danh mục:**
  - Thu: Lương, Thưởng, Làm thêm, Thu khác.
  - Chi: Ăn uống, Đi lại, Nhà & hóa đơn, Mua sắm, Sức khỏe, Học tập, Giải
    trí, Thể thao, Từ thiện, Dịch vụ & thuê bao, Chi khác.
  - Muốn thêm danh mục thì sửa `src/app/core/constants/categories.ts`.
- **Chú thích:** dữ liệu chỉ cập nhật trên màn hình sau khi server lưu thành
  công. Lỗi kết nối sẽ hiện thông báo kèm nút **Thử lại**.
- **Code:** `src/app/features/transactions/transaction-form/`,
  `src/app/shared/ui/amount-input/`, `server/src/transactions.ts`

### 2.5. Danh sách giao dịch trong tháng

- **Chức năng:** liệt kê mọi giao dịch của tháng.
- **Cách dùng:** dùng bộ lọc **Tất cả / Thu / Chi** để lọc danh sách.
- **Chú thích:**
  - Mục **"Khoản cố định hằng tháng"** đứng đầu, xếp theo ngày. Các khoản này
    có nhãn **Cố định**, không có nút Sửa/Xóa (sửa ở card Khoản cố định).
  - Bên dưới là các giao dịch thường, gom nhóm theo ngày.
- **Code:** `src/app/features/transactions/transaction-list/`,
  `transaction-item/`

### 2.6. Khoản thu/chi cố định hằng tháng

- **Chức năng:** khai báo một lần các khoản tháng nào cũng có (Spotify, cước
  điện thoại, tiền nhà, lương…). Các khoản này tự được tính vào mọi tháng.
- **Cách dùng:**
  - Bấm **+ Thêm khoản cố định**, chọn Khoản chi hoặc Khoản thu, nhập tên, số
    tiền mỗi tháng, ngày đóng/nhận (1–31) và danh mục.
  - Sửa ngay trong card. Xóa phải bấm 2 lần (**Xóa** → **Chắc chắn?**) để
    tránh bấm nhầm.
- **Chú thích:**
  - Card hiện các khoản áp dụng cho tháng đang xem, chia thành **Chi cố
    định** và **Thu cố định**, kèm tổng mỗi tháng.
  - Các khoản này **không lưu thành giao dịch** trong database. Ứng dụng tự
    tính ra một khoản cho mỗi tháng, nên tổng thu/chi, biểu đồ và báo cáo năm
    đều đã cộng sẵn.
  - Sửa hoặc xóa áp dụng **từ tháng đang xem trở đi**, các tháng trước giữ
    nguyên số cũ.
  - Ngày 29–31 ở tháng ngắn hơn được dồn về ngày cuối tháng.
- **Code:** `src/app/features/recurring/`,
  `src/app/core/state/recurring.store.ts`,
  `src/app/core/utils/recurring.util.ts`, `server/src/recurring.ts`

### 2.7. Biểu đồ danh mục

- **Chức năng:** xem tiền thu hoặc chi dồn vào danh mục nào.
- **Cách dùng:** chọn **Chi / Thu**. Biểu đồ gồm một thanh tỷ trọng và bảng
  xếp hạng danh mục từ lớn đến nhỏ. **Bấm vào một danh mục** để xem danh sách
  giao dịch của danh mục đó ngay bên dưới, bấm lại để đóng.
- **Chú thích:** đổi tháng hoặc đổi Thu/Chi thì lựa chọn tự bỏ. Mỗi danh mục
  có biểu tượng và tên, nên không cần dựa vào màu để phân biệt.
- **Code:** `src/app/features/summary/category-chart/`,
  `src/app/shared/ui/charts/`

### 2.8. Dữ liệu mẫu

- **Chức năng:** có sẵn dữ liệu để xem thử ứng dụng.
- **Cách dùng:** khi sổ đang chứa dữ liệu mẫu sẽ có thông báo kèm nút **Xóa dữ
  liệu mẫu**. Tạo dữ liệu mẫu cho một tài khoản bằng lệnh
  `npm run db:seed -- <email>` (trong thư mục `server/`).
- **Code:** `server/src/seed.ts`, `DELETE /api/transactions/sample`

---

## 3. Trang Năm (`/nam`)

- **Chức năng:** tổng kết cả năm.
- **Cách dùng:** chuyển sang tab **Năm** rồi chọn năm bằng bộ chọn năm.
- **Gồm:**
  - **Tổng thu · Tổng chi · Còn lại** của cả năm.
  - **Biểu đồ cột "Thu chi theo tháng":** 12 cặp cột thu và chi. Rê chuột hoặc
    focus vào một tháng sẽ hiện thu, chi và còn lại của tháng đó.
  - **Bảng "Chi tiết từng tháng":** các cột Thu / Chi / **Còn lại** cho từng
    tháng và dòng tổng **Cả năm**. Bấm tên tháng để mở tháng đó ở trang
    Tháng.
  - **Danh mục cả năm:** giống biểu đồ danh mục của trang Tháng, nhưng tính
    cho cả năm.
- **Chú thích:** đổi năm vẫn giữ nguyên tháng trong năm. Các khoản cố định
  được cộng vào đủ 12 tháng.
- **Code:** `src/app/features/year-report/`

---

## 4. Kế toán quản trị — Phân tích CVP (`/ke-toan`)

Chuyển sang bằng nút **Kế toán** trên header. CVP là phân tích Chi phí –
Sản lượng – Lợi nhuận, dùng cho một hoạt động kinh doanh nhỏ (xưởng, quán cà
phê…).

### 4.1. Phương án & số liệu đầu vào

- **Chức năng:** lưu nhiều phương án kinh doanh, mỗi phương án gồm giá bán,
  sản lượng và các khoản chi phí.
- **Cách dùng:**
  - Chọn phương án trong danh sách, thêm phương án mới, hoặc tạo từ ví dụ có
    sẵn: **xưởng ghế** hoặc **quán cà phê theo tháng**.
  - Chi phí được chia thành **Biến phí** (tính trên mỗi sản phẩm) và **Định
    phí** (tính theo kỳ). Bấm nút ⇄ để chuyển một khoản sang nhóm kia.
  - Các ô có nút **i** giải thích thuật ngữ.
- **Chú thích:** kết quả tính lại ngay khi đang gõ, chưa cần lưu. Có báo khi
  còn thay đổi chưa lưu.
- **Code:** `src/app/features/accounting/plan-form/`,
  `src/app/core/state/cvp.store.ts`, `server/src/cvp-plans.ts`

### 4.2. Kết quả phân tích

- **KPI:**
  - **Sản lượng hòa vốn** và **Doanh thu hòa vốn**. Không tính được khi giá
    bán ≤ biến phí. Sản lượng lẻ được làm tròn lên.
  - **Số dư an toàn**.
  - **Đòn bẩy hoạt động (DOL)**, chỉ tính khi đang có lãi.
- **Báo cáo kết quả theo số dư đảm phí:** các cột Tổng / trên mỗi đơn vị / %
  doanh thu.
- **Lợi nhuận mục tiêu:** cần bán bao nhiêu và doanh thu cần đạt, có tính
  thuế thu nhập (thuế chỉ áp dụng khi có lãi). Kèm so sánh với kế hoạch.
- **Code:** `src/app/features/accounting/cvp-report/`,
  `src/app/core/accounting/cvp.ts`

### 4.3. Đồ thị hòa vốn

- Đường doanh thu và đường chi phí theo sản lượng. Bên trái điểm hòa vốn là
  lỗ, bên phải là lãi.
- **Code:** `src/app/shared/ui/charts/line-chart/`

### 4.4. Phân tích "Nếu… thì…" & độ nhạy

- **Chức năng:** thử tăng hoặc giảm giá bán, biến phí, định phí, sản lượng
  theo % mà không sửa số liệu gốc. Bảng so sánh Hiện tại / Sau thay đổi /
  Chênh lệch.
- **Độ nhạy:** tăng từng yếu tố thêm 10% rồi xếp hạng yếu tố nào ảnh hưởng tới
  lợi nhuận nhiều nhất.
- **Code:** `src/app/features/accounting/what-if/`

---

## 5. Giao diện chung

### 5.1. Chế độ sáng / tối

- **Cách dùng:** nút chuyển ở chân trang có 3 chế độ: **Tự động** (theo hệ
  điều hành), **Sáng**, **Tối**.
- **Chú thích:** lựa chọn được lưu trong trình duyệt và áp dụng ngay khi mở
  trang, không bị nháy màu. Màu chế độ tối được chỉnh riêng chứ không chỉ đảo
  ngược màu sáng.
- **Code:** `src/app/core/state/theme.store.ts`,
  `src/app/shared/ui/theme-toggle/`

### 5.2. Thiết kế & khả năng tiếp cận

- Dùng tốt trên điện thoại và máy tính.
- Toàn bộ màu, khoảng cách, cỡ chữ lấy từ design token
  (`src/styles/_tokens.scss`). Lệnh `npm run lint:styles` báo lỗi khi code
  dùng giá trị cứng.
- Bảng màu biểu đồ đã được kiểm tra cho người mù màu. Các nút đều có nhãn cho
  trình đọc màn hình.

---

## 6. Triển khai (deploy)

- Một service duy nhất trên **Render** (`render.yaml` ở thư mục cha). Backend
  Express phục vụ cả API lẫn bản build Angular.
- Database PostgreSQL bên ngoài (**Neon**), khai báo qua `DATABASE_URL`.
- `GET /api/health` dùng để kiểm tra server còn sống.
- Cấu trúc database (`server/db/schema.sql`) tự được áp dụng mỗi lần server
  khởi động.

---

## Bảng API (tham khảo nhanh)

Mọi API trừ `/api/auth/*` và `/api/health` đều cần đăng nhập và chỉ trả dữ
liệu của tài khoản đang dùng.

| Đường dẫn | Chức năng |
|---|---|
| `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me` | Tài khoản |
| `GET/POST /api/transactions`, `PUT/DELETE /api/transactions/:id` | Giao dịch |
| `DELETE /api/transactions/sample` | Xóa dữ liệu mẫu |
| `GET/POST /api/recurring`, `PUT /:id` (kèm `fromMonth`), `DELETE /:id?from=` | Khoản cố định |
| `GET /api/savings-goals`, `PUT /api/savings-goals/:month` | Mục tiêu tiết kiệm |
| `GET/POST /api/cvp-plans`, `PUT/DELETE /api/cvp-plans/:id` | Phương án CVP |
| `GET /api/health` | Kiểm tra server |
