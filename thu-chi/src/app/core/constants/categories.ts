import { Category, TransactionType } from '../models';

/**
 * Màu dùng token `--series-1` … `--series-10` (định nghĩa trong
 * styles/_tokens.scss, có bản sáng/tối riêng). Thứ tự slot đã được kiểm tra
 * để các màu kề nhau phân biệt được với người mù màu — giữ nguyên thứ tự;
 * danh mục thứ 11 trở đi dùng --series-other thay vì sinh thêm màu.
 */
export const CATEGORIES: readonly Category[] = [
    {
        id: 'salary',
        name: 'Lương',
        icon: '💼',
        color: 'var(--series-1)',
        type: 'income',
        noteHint: 'VD: Lương tháng 10',
    },
    {
        id: 'bonus',
        name: 'Thưởng',
        icon: '🎁',
        color: 'var(--series-2)',
        type: 'income',
        noteHint: 'VD: Thưởng Tết, thưởng dự án',
    },
    {
        id: 'side-job',
        name: 'Làm thêm',
        icon: '💡',
        color: 'var(--series-3)',
        type: 'income',
        noteHint: 'VD: Dạy kèm, freelance',
    },
    {
        id: 'other-income',
        name: 'Thu khác',
        icon: '💰',
        color: 'var(--series-other)',
        type: 'income',
        noteHint: 'VD: Bán đồ cũ, được tặng',
    },

    {
        id: 'food',
        name: 'Ăn uống',
        icon: '🍜',
        color: 'var(--series-1)',
        type: 'expense',
        noteHint: 'VD: Ăn trưa, cà phê, đi chợ',
    },
    {
        id: 'transport',
        name: 'Đi lại',
        icon: '🛵',
        color: 'var(--series-2)',
        type: 'expense',
        noteHint: 'VD: Đổ xăng, Grab, gửi xe',
    },
    {
        id: 'housing',
        name: 'Nhà & hóa đơn',
        icon: '🏠',
        color: 'var(--series-3)',
        type: 'expense',
        noteHint: 'VD: Tiền nhà, điện, nước, internet',
    },
    {
        id: 'shopping',
        name: 'Mua sắm',
        icon: '🛍️',
        color: 'var(--series-4)',
        type: 'expense',
        noteHint: 'VD: Quần áo, đồ gia dụng',
    },
    {
        id: 'health',
        name: 'Sức khỏe',
        icon: '❤️',
        color: 'var(--series-5)',
        type: 'expense',
        noteHint: 'VD: Khám bệnh, thuốc, bảo hiểm',
    },
    {
        id: 'education',
        name: 'Học tập',
        icon: '📚',
        color: 'var(--series-6)',
        type: 'expense',
        noteHint: 'VD: Học phí, sách, khóa học online',
    },
    {
        id: 'entertainment',
        name: 'Giải trí',
        icon: '🎬',
        color: 'var(--series-7)',
        type: 'expense',
        noteHint: 'VD: Xem phim, du lịch, game',
    },
    {
        id: 'sports',
        name: 'Thể thao',
        icon: '🏸',
        color: 'var(--series-8)',
        type: 'expense',
        noteHint: 'VD: Sân cầu lông, phí gym',
    },
    {
        id: 'charity',
        name: 'Từ thiện',
        icon: '🤝',
        color: 'var(--series-9)',
        type: 'expense',
        noteHint: 'VD: Ủng hộ bão lũ',
    },
    {
        id: 'subscriptions',
        name: 'Dịch vụ & thuê bao',
        icon: '📱',
        color: 'var(--series-10)',
        type: 'expense',
        noteHint: 'VD: Claude, Spotify, iCloud, thẻ điện thoại',
    },
    {
        id: 'other-expense',
        name: 'Chi khác',
        icon: '📦',
        color: 'var(--series-other)',
        type: 'expense',
        noteHint: 'VD: Quà cưới, sửa đồ',
    },
];

const FALLBACK: Category = {
    id: 'unknown',
    name: 'Không rõ',
    icon: '❔',
    color: 'var(--series-other)',
    type: 'expense',
    noteHint: 'Ghi chú thêm (không bắt buộc)',
};

export function findCategory(id: string): Category {
    return CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}

export function categoriesOf(type: TransactionType): Category[] {
    return CATEGORIES.filter((c) => c.type === type);
}
