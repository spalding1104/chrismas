import { ComponentFixture, TestBed } from '@angular/core/testing';

import { findCategory } from '../../../core/constants/categories';
import { CategoryTotal, Transaction } from '../../../core/models';
import { CategoryChart } from './category-chart';

function totalOf(
    categoryId: string,
    total: number,
    count: number,
): CategoryTotal {
    return { category: findCategory(categoryId), total, count, percent: 0 };
}

function txOf(
    id: string,
    categoryId: string,
    amount: number,
    note: string,
): Transaction {
    return {
        id,
        type: 'expense',
        categoryId,
        amount,
        note,
        date: '2026-10-01',
    };
}

describe('CategoryChart', () => {
    let fixture: ComponentFixture<CategoryChart>;
    let el: HTMLElement;

    const items: CategoryTotal[] = [
        totalOf('food', 200_000, 2),
        totalOf('transport', 50_000, 1),
    ];
    const transactions: Transaction[] = [
        txOf('t1', 'food', 150_000, 'Ăn trưa'),
        txOf('t2', 'food', 50_000, 'Cà phê'),
        txOf('t3', 'transport', 50_000, 'Xăng xe'),
    ];

    const row = (label: string) =>
        [...el.querySelectorAll('.row')].find((r) =>
            r.textContent!.includes(label),
        ) as HTMLElement;
    const detailNotes = () =>
        [...el.querySelectorAll('.detail__note')].map((n) =>
            n.textContent!.trim(),
        );

    beforeEach(async () => {
        fixture = TestBed.createComponent(CategoryChart);
        fixture.componentRef.setInput('items', items);
        fixture.componentRef.setInput('transactions', transactions);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    it('shows no detail panel until a category is clicked', () => {
        expect(el.querySelector('.detail')).toBeNull();
    });

    it('shows the matching transactions when a row is clicked (no repeated title)', async () => {
        row('Ăn uống').click();
        await fixture.whenStable();

        expect(detailNotes()).toEqual(['Ăn trưa', 'Cà phê']);
        // Không tiêu đề lặp tên danh mục, không nút đóng: bấm lại hàng để
        // đóng.
        const detail = el.querySelector('.detail')!;
        expect(detail.querySelector('h4, button')).toBeNull();
    });

    it('drops the detail right below the clicked row, not at the end', async () => {
        const first = row('Ăn uống');
        first.click();
        await fixture.whenStable();

        // .row-detail (của BarChart) là anh em liền kề ngay sau .row vừa
        // bấm, không phải nằm cuối danh sách các hàng.
        const detailHolder = first.nextElementSibling!;
        expect(detailHolder.className).toContain('row-detail');
        expect(detailHolder.querySelector('.detail')).not.toBeNull();
    });

    it('toggles off when the same row is clicked again', async () => {
        row('Ăn uống').click();
        await fixture.whenStable();
        row('Ăn uống').click();
        await fixture.whenStable();

        expect(el.querySelector('.detail')).toBeNull();
    });

    it('switches detail when a different row is clicked', async () => {
        row('Ăn uống').click();
        await fixture.whenStable();
        row('Đi lại').click();
        await fixture.whenStable();

        expect(detailNotes()).toEqual(['Xăng xe']);
    });

    it('closes the detail panel when items() changes (e.g. month switch)', async () => {
        row('Ăn uống').click();
        await fixture.whenStable();

        fixture.componentRef.setInput('items', [totalOf('food', 10_000, 1)]);
        await fixture.whenStable();

        expect(el.querySelector('.detail')).toBeNull();
    });

    it('opens and closes from the keyboard on the row', async () => {
        const r = row('Ăn uống');
        r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await fixture.whenStable();
        expect(el.querySelector('.detail')).not.toBeNull();

        r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await fixture.whenStable();
        expect(el.querySelector('.detail')).toBeNull();
    });
});
