/** yyyy-MM của một Date theo giờ địa phương. */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** yyyy-MM-dd của một Date theo giờ địa phương. */
export function toDateKey(date: Date): string {
  return `${toMonthKey(date)}-${pad(date.getDate())}`;
}

export function monthOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(y, m - 1 + delta, 1));
}

export function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `Tháng ${m}, ${y}`;
}

/** Ngày mặc định khi thêm giao dịch: hôm nay nếu đang xem tháng này, ngược lại là ngày 1 của tháng. */
export function defaultDateFor(monthKey: string, today = new Date()): string {
  return monthKey === toMonthKey(today) ? toDateKey(today) : `${monthKey}-01`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
