import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavingsGoal } from '../../../core/models';
import { SavingsGoalCard } from './savings-goal-card';

describe('SavingsGoalCard', () => {
    let fixture: ComponentFixture<SavingsGoalCard>;
    let el: HTMLElement;
    let saved: number[];

    const button = (text: string) =>
        [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
            b.textContent!.includes(text),
        )!;
    const click = async (b: HTMLElement) => {
        b.click();
        await fixture.whenStable();
    };
    const values = () =>
        [...el.querySelectorAll('.figure__value')].map((v) =>
            v.textContent!.trim(),
        );

    async function render(
        goal: SavingsGoal | null,
        income = 20_000_000,
        expense = 6_000_000,
        fixedExpense = 0,
    ) {
        saved = [];
        fixture = TestBed.createComponent(SavingsGoalCard);
        fixture.componentRef.setInput('goal', goal);
        fixture.componentRef.setInput('month', '2026-10');
        fixture.componentRef.setInput('income', income);
        fixture.componentRef.setInput('expense', expense);
        fixture.componentRef.setInput('fixedExpense', fixedExpense);
        fixture.componentRef.setInput('today', new Date(2026, 9, 5));
        fixture.componentInstance.save.subscribe((v) => saved.push(v));
        el = fixture.nativeElement;
        await fixture.whenStable();
    }

    it('invites the user to set a goal when there is none', async () => {
        await render(null);
        expect(el.querySelector('.figures')).toBeNull();
        await click(button('Đặt mục tiêu'));
        expect(el.querySelector('#goal-amount')).not.toBeNull();
    });

    it('shows the goal, the monthly limit and what is left', async () => {
        await render({ month: '2026-08', amount: 5_000_000 });
        const [goal, limit, left] = values();
        expect(goal).toContain('5.000.000');
        expect(limit).toContain('15.000.000');
        expect(left).toContain('9.000.000');
        expect(el.textContent).toContain('Từ Tháng 8, 2026');
        expect(el.textContent).toContain('333.333');
        expect(el.textContent).toContain('27 ngày còn lại');
        expect(el.querySelector('.status--warn')).toBeNull();
    });

    it('takes fixed expenses off the limit', async () => {
        // Thu 20tr − tiết kiệm 5tr − cố định 3tr = 12tr; tổng chi 9tr gồm cả
        // 3tr cố định → đã tiêu 6tr, còn 6tr.
        await render(
            { month: '2026-08', amount: 5_000_000 },
            20_000_000,
            9_000_000,
            3_000_000,
        );
        const [, limit, left] = values();
        expect(limit).toContain('12.000.000');
        expect(left).toContain('6.000.000');
        expect(el.textContent).toContain('cố định 3.000.000');
        expect(el.querySelector('.usage__label')?.textContent).toContain(
            'ngoài khoản cố định 6.000.000',
        );
        expect(el.querySelector('.usage__label')?.textContent).toContain(
            '(50%)',
        );
    });

    it('warns once spending passes the limit', async () => {
        await render(
            { month: '2026-08', amount: 5_000_000 },
            20_000_000,
            16_000_000,
        );
        expect(el.textContent).toContain('Đã tiêu lố');
        expect(values()[2]).toContain('1.000.000');
        expect(el.querySelector('.figure--over')).not.toBeNull();
        expect(el.querySelector('.status--warn')?.textContent).toContain(
            'thiếu 1.000.000',
        );
    });

    it('emits the new amount, or 0 to clear the goal', async () => {
        await render({ month: '2026-08', amount: 5_000_000 });
        await click(button('Sửa mục tiêu'));
        const input = el.querySelector<HTMLInputElement>('#goal-amount')!;
        expect(input.value).toBe('5.000.000');
        // Gợi ý 20% của 20tr = 4tr.
        await click(button('20%'));
        await click(button('Lưu mục tiêu'));
        expect(saved).toEqual([4_000_000]);

        await click(button('Sửa mục tiêu'));
        await click(button('Bỏ mục tiêu'));
        expect(saved).toEqual([4_000_000, 0]);
    });

    it('does not save an empty amount', async () => {
        await render(null);
        await click(button('Đặt mục tiêu'));
        await click(button('Lưu mục tiêu'));
        expect(saved).toEqual([]);
        expect(el.querySelector('.field__error')).not.toBeNull();
    });
});
