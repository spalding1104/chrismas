import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionDraft } from '../../../core/models';
import { TransactionForm } from './transaction-form';

describe('TransactionForm', () => {
    let fixture: ComponentFixture<TransactionForm>;
    let el: HTMLElement;

    const amountInput = () => el.querySelector<HTMLInputElement>('#tx-amount')!;
    const keyLabels = () =>
        [...el.querySelectorAll('.keypad__key')].map((b) =>
            b.textContent!.trim(),
        );
    const type = async (value: string) => {
        amountInput().value = value;
        amountInput().dispatchEvent(new Event('input'));
        await fixture.whenStable();
    };
    /** Bấm lần lượt các phím số, vd. press('500') = bấm 5, 0, 0. */
    const press = async (digits: string) => {
        for (const d of digits) {
            [...el.querySelectorAll<HTMLButtonElement>('.keypad__key')]
                .find((b) => b.textContent!.trim() === d)!
                .click();
        }
        await fixture.whenStable();
    };

    beforeEach(async () => {
        fixture = TestBed.createComponent(TransactionForm);
        fixture.componentRef.setInput('defaultDate', '2026-10-02');
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    it('always shows a 1–0 keypad, even before anything is typed', () => {
        expect(keyLabels()).toEqual([
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '0',
        ]);
        expect(
            [...el.querySelectorAll('.quick .chip')].map((c) =>
                c.textContent!.trim(),
            ),
        ).toEqual(['+50k', '+100k', '+200k', '000', '0000']);
    });

    it('builds the amount from keypad presses', async () => {
        await press('50000');
        expect(amountInput().value).toBe('50.000');
    });

    it('appends keypad digits after what was typed', async () => {
        await type('12');
        await press('000');
        expect(amountInput().value).toBe('12.000');
    });

    it('puts the 1–0 keypad above the +k chips', () => {
        const keypad = el.querySelector('.keypad')!;
        const quick = el.querySelector('.quick')!;
        expect(
            keypad.compareDocumentPosition(quick) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('deletes one digit at a time with the backspace button', async () => {
        const backspace = () =>
            el.querySelector<HTMLButtonElement>('.amount__backspace');
        expect(backspace()).toBeNull();

        await press('50000');
        backspace()!.click();
        await fixture.whenStable();
        expect(amountInput().value).toBe('5.000');

        for (let i = 0; i < 4; i++) backspace()!.click();
        await fixture.whenStable();
        expect(amountInput().value).toBe('');
        expect(backspace()).toBeNull();
    });

    it('shows the reset button only when there is an amount, and clears it', async () => {
        const reset = () =>
            el.querySelector<HTMLButtonElement>('.amount-reset')!;
        // Ẩn (visibility) chứ không gỡ khỏi DOM, để hàng nhãn giữ nguyên cao.
        const hidden = () =>
            reset().classList.contains('amount-reset--hidden') &&
            reset().disabled;
        expect(hidden()).toBe(true);

        await press('45000');
        expect(hidden()).toBe(false);
        reset().click();
        await fixture.whenStable();

        expect(amountInput().value).toBe('');
        expect(hidden()).toBe(true);
    });

    it('backspace drops a dangling decimal: 1,5 → 1', async () => {
        await type('1,5');
        el.querySelector<HTMLButtonElement>('.amount__backspace')!.click();
        await fixture.whenStable();
        expect(amountInput().value).toBe('1');
    });

    describe('9-digit limit', () => {
        it('ignores keypad presses past 9 digits', async () => {
            await press('1234567890');
            expect(amountInput().value).toBe('123.456.789');
        });

        it('rejects typing a 10th digit and keeps the previous value', async () => {
            await type('123456789');
            await type('1234567890');
            expect(amountInput().value).toBe('123.456.789');
        });

        it('ignores a +k chip that would go past the limit', async () => {
            await press('999990000');
            el.querySelector<HTMLButtonElement>('.quick .chip')!.click(); // +50k
            await fixture.whenStable();
            expect(amountInput().value).toBe('999.990.000');
        });
    });

    describe('000 / 0000 chips', () => {
        const zeros = async (label: string) => {
            [...el.querySelectorAll<HTMLButtonElement>('.chip--zeros')]
                .find((c) => c.textContent!.trim() === label)!
                .click();
            await fixture.whenStable();
        };

        it('append zeros: 5 + 000 → 5.000, then + 0000 → 50.000.000', async () => {
            await press('5');
            await zeros('000');
            expect(amountInput().value).toBe('5.000');
            await zeros('0000');
            expect(amountInput().value).toBe('50.000.000');
        });

        it('turn a decimal shorthand into a whole amount: 1,5 + 000 → 1.500', async () => {
            await type('1,5');
            await zeros('000');
            expect(amountInput().value).toBe('1.500');
        });

        it('do nothing on an empty field or past 9 digits', async () => {
            await zeros('000');
            expect(amountInput().value).toBe('');

            await press('500000');
            await zeros('0000');
            expect(amountInput().value).toBe('500.000');
        });
    });

    it('drops a leading zero', async () => {
        await press('05');
        expect(amountInput().value).toBe('5');
    });

    it('submits an amount entered only with the keypad', async () => {
        const saved: TransactionDraft[] = [];
        fixture.componentInstance.saved.subscribe((d) => saved.push(d));

        await press('45000');
        el.querySelector<HTMLButtonElement>('.btn--primary')!.click();
        await fixture.whenStable();

        expect(saved.map((d) => d.amount)).toEqual([45_000]);
        expect(amountInput().value).toBe('');
    });

    describe('validation messages', () => {
        const error = () => el.querySelector('.field__error');
        const submit = async () => {
            el.querySelector<HTMLButtonElement>('.btn--primary')!.click();
            await fixture.whenStable();
        };

        it('stays hidden while typing, leaving the field or using chips', async () => {
            await type('5');
            amountInput().dispatchEvent(new Event('blur'));
            await fixture.whenStable();
            expect(error()).toBeNull();

            // Về trống bằng ⌫ rồi bấm chip: vẫn chưa báo lỗi.
            el.querySelector<HTMLButtonElement>('.amount__backspace')!.click();
            await fixture.whenStable();
            expect(error()).toBeNull();
        });

        it('appears only after pressing the submit button', async () => {
            await type('5');
            await submit();
            expect(error()?.textContent).toContain('1.000');
        });

        it('disappears as soon as the amount becomes valid', async () => {
            await submit();
            expect(error()).not.toBeNull();

            await type('5000');
            expect(error()).toBeNull();
        });

        it('is cleared again after a successful submit', async () => {
            await submit();
            await type('50000');
            await submit();
            // Form làm mới về trống — không báo lỗi cho lần nhập tiếp theo.
            expect(amountInput().value).toBe('');
            expect(error()).toBeNull();
        });
    });

    it('formats the amount with thousand separators while typing', async () => {
        await type('1234567');
        expect(amountInput().value).toBe('1.234.567');
        expect(el.querySelector('.field__hint')).toBeNull();
    });

    it('shows a note placeholder that matches the chosen category', async () => {
        const note = () => el.querySelector<HTMLInputElement>('#tx-note')!;
        const pick = async (name: string) => {
            [...el.querySelectorAll<HTMLButtonElement>('.category')]
                .find((b) => b.textContent!.includes(name))!
                .click();
            await fixture.whenStable();
        };

        await pick('Đi lại');
        expect(note().placeholder).toBe('VD: Đổ xăng, Grab, gửi xe');
        await pick('Dịch vụ & thuê bao');
        expect(note().placeholder).toContain('Spotify');
    });
});
