import { Category, TransactionType } from '../models';

/**
 * Màu dùng token `--series-*` (định nghĩa trong styles.scss, có bản
 * sáng/tối riêng). Thứ tự slot đã được kiểm tra phân biệt được với người
 * mù màu — giữ nguyên thứ tự, danh mục mới nên gom vào "khác" thay vì
 * sinh thêm màu.
 */
export const CATEGORIES: readonly Category[] = [
    {
        id: 'salary',
        name: 'Lương',
        icon: '💼',
        color: 'var(--series-1)',
        type: 'income',
    },
    {
        id: 'bonus',
        name: 'Thưởng',
        icon: '🎁',
        color: 'var(--series-2)',
        type: 'income',
    },
    {
        id: 'side-job',
        name: 'Làm thêm',
        icon: '💡',
        color: 'var(--series-3)',
        type: 'income',
    },
    {
        id: 'other-income',
        name: 'Thu khác',
        icon: '💰',
        color: 'var(--series-other)',
        type: 'income',
    },

    {
        id: 'food',
        name: 'Ăn uống',
        icon: '🍜',
        color: 'var(--series-1)',
        type: 'expense',
    },
    {
        id: 'transport',
        name: 'Đi lại',
        icon: '🛵',
        color: 'var(--series-2)',
        type: 'expense',
    },
    {
        id: 'housing',
        name: 'Nhà & hóa đơn',
        icon: '🏠',
        color: 'var(--series-3)',
        type: 'expense',
    },
    {
        id: 'shopping',
        name: 'Mua sắm',
        icon: '🛍️',
        color: 'var(--series-4)',
        type: 'expense',
    },
    {
        id: 'health',
        name: 'Sức khỏe',
        icon: '💊',
        color: 'var(--series-5)',
        type: 'expense',
    },
    {
        id: 'education',
        name: 'Học tập',
        icon: '📚',
        color: 'var(--series-6)',
        type: 'expense',
    },
    {
        id: 'entertainment',
        name: 'Giải trí',
        icon: '🎬',
        color: 'var(--series-7)',
        type: 'expense',
    },
    {
        id: 'other-expense',
        name: 'Chi khác',
        icon: '📦',
        color: 'var(--series-other)',
        type: 'expense',
    },
];

const FALLBACK: Category = {
    id: 'unknown',
    name: 'Không rõ',
    icon: '❔',
    color: 'var(--series-other)',
    type: 'expense',
};

export function findCategory(id: string): Category {
    return CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}

export function categoriesOf(type: TransactionType): Category[] {
    return CATEGORIES.filter((c) => c.type === type);
}
