import { TransactionDraft } from '../models';

/** Dữ liệu mẫu cho tháng đang xem, để trang không trống ở lần mở đầu tiên. */
export function buildSampleData(monthKey: string): TransactionDraft[] {
  const d = (day: number) => `${monthKey}-${String(day).padStart(2, '0')}`;
  return [
    { type: 'income', amount: 15_000_000, categoryId: 'salary', note: 'Lương tháng', date: d(1) },
    { type: 'income', amount: 2_500_000, categoryId: 'side-job', note: 'Dự án thiết kế', date: d(12) },
    { type: 'expense', amount: 4_000_000, categoryId: 'housing', note: 'Tiền nhà', date: d(2) },
    { type: 'expense', amount: 650_000, categoryId: 'housing', note: 'Điện nước, internet', date: d(5) },
    { type: 'expense', amount: 85_000, categoryId: 'food', note: 'Ăn trưa với đồng nghiệp', date: d(3) },
    { type: 'expense', amount: 1_200_000, categoryId: 'food', note: 'Đi chợ cả tuần', date: d(7) },
    { type: 'expense', amount: 320_000, categoryId: 'transport', note: 'Đổ xăng', date: d(8) },
    { type: 'expense', amount: 890_000, categoryId: 'shopping', note: 'Giày chạy bộ', date: d(10) },
    { type: 'expense', amount: 240_000, categoryId: 'entertainment', note: 'Xem phim cuối tuần', date: d(14) },
    { type: 'expense', amount: 450_000, categoryId: 'education', note: 'Khóa học tiếng Anh online', date: d(15) },
  ];
}
