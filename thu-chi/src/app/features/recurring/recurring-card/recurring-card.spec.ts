import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecurringDraft, RecurringItem } from '../../../core/models';
import { RecurringCard } from './recurring-card';

describe('RecurringCard', () => {
    let fixture: ComponentFixture<RecurringCard>;
    let el: HTMLElement;
    let created: RecurringDraft[];
    let updated: { id: string; draft: RecurringDraft }[];
    let removed: string[];

    const base: Omit<RecurringItem, 'id' | 'note'> = {
        type: 'expense',
        amount: 59_000,
        categoryId: 'subscriptions',
        day: 5,
        startMonth: '2026-01',
        endMonth: null,
    };
    const items: RecurringItem[] = [
        { ...base, id: 'spotify', note: 'Spotify' },
        { ...base, id: 'phone', note: 'Cước điện thoại', amount: 100_000 },
        // Đã ngừng trước tháng đang xem: không hiện.
        { ...base, id: 'gym', note: 'Gym', endMonth: '2026-05' },
        {
            ...base,
            id: 'salary',
            type: 'income',
            note: 'Lương',
            amount: 10_000_000,
            categoryId: 'salary',
        },
    ];

    const titles = () =>
        [...el.querySelectorAll('.item__title')].map((t) =>
            t.textContent!.trim(),
        );
    const button = (text: string) =>
        [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
            b.textContent!.includes(text),
        )!;
    const click = async (b: HTMLElement) => {
        b.click();
        await fixture.whenStable();
    };
    const fill = async (selector: string, value: string) => {
        const input = el.querySelector<HTMLInputElement>(selector)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        await fixture.whenStable();
    };

    beforeEach(async () => {
        created = [];
        updated = [];
        removed = [];
        fixture = TestBed.createComponent(RecurringCard);
        fixture.componentRef.setInput('items', items);
        fixture.componentRef.setInput('month', '2026-10');
        fixture.componentInstance.create.subscribe((d) => created.push(d));
        fixture.componentInstance.update.subscribe((u) => updated.push(u));
        fixture.componentInstance.remove.subscribe((id) => removed.push(id));
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    it('lists only items active in the viewed month, with monthly totals', () => {
        expect(titles()).toEqual(['Spotify', 'Cước điện thoại', 'Lương']);
        const totals = [...el.querySelectorAll('.group__total')].map((t) =>
            t.textContent!.replace(/ /g, ' ').trim(),
        );
        expect(totals).toEqual(['159.000 ₫/tháng', '10.000.000 ₫/tháng']);
        expect(el.querySelector('.hint')?.textContent).toContain(
            'Tháng 10, 2026',
        );
    });

    it('adds a new item', async () => {
        await click(button('Thêm khoản cố định'));
        await fill('#rec-note', 'iCloud');
        await fill('#rec-amount', '45000');
        await click(button('Thêm khoản'));

        expect(created).toEqual([
            {
                type: 'expense',
                note: 'iCloud',
                amount: 45_000,
                day: new Date().getDate(),
                categoryId: 'food',
            },
        ]);
        expect(el.querySelector('app-recurring-form')).toBeNull();
    });

    it('does not submit an invalid amount and shows the error', async () => {
        await click(button('Thêm khoản cố định'));
        await click(button('Thêm khoản'));
        expect(created).toEqual([]);
        expect(el.querySelector('.field__error')).not.toBeNull();
    });

    it('edits an item in place, prefilled', async () => {
        await click(
            el.querySelector<HTMLButtonElement>('[aria-label="Sửa Spotify"]')!,
        );
        const amount = el.querySelector<HTMLInputElement>('#rec-amount')!;
        expect(amount.value).toBe('59.000');

        await fill('#rec-amount', '65000');
        await click(button('Lưu thay đổi'));
        expect(updated).toEqual([
            {
                id: 'spotify',
                draft: {
                    type: 'expense',
                    note: 'Spotify',
                    amount: 65_000,
                    day: 5,
                    categoryId: 'subscriptions',
                },
            },
        ]);
    });

    it('needs two clicks to delete', async () => {
        const del = () =>
            el.querySelectorAll<HTMLButtonElement>('.tool--danger')[0]!;
        await click(del());
        expect(removed).toEqual([]);
        expect(del().textContent).toContain('Chắc chắn?');
        await click(del());
        expect(removed).toEqual(['spotify']);
    });
});
