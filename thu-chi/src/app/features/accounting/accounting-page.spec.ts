import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthStore } from '../../core/auth';
import { CVP_PLANS_API, examplePlan } from '../../core/state/cvp.store';
import { AccountingPage } from './accounting-page';

describe('AccountingPage', () => {
    let fixture: ComponentFixture<AccountingPage>;
    let el: HTMLElement;
    let http: HttpTestingController;

    const text = () => el.textContent?.replace(/\s+/g, ' ') ?? '';
    // Chờ promise của HttpClient chạy xong rồi mới render lại.
    const settle = async () => {
        await new Promise((r) => setTimeout(r));
        await fixture.whenStable();
    };

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: AuthStore,
                    useValue: { user: signal({ id: 'a', email: 'a@test.vn' }) },
                },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(AccountingPage);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    it('offers the example when there are no plans yet', async () => {
        http.expectOne(CVP_PLANS_API).flush([]);
        await settle();
        expect(text()).toContain('Chưa có phương án nào');
        expect(text()).toContain('Ví dụ: Xưởng sản xuất ghế');
        expect(text()).toContain('Ví dụ: Quán cà phê');
    });

    it('analyses the saved plan and recalculates while typing', async () => {
        http.expectOne(CVP_PLANS_API).flush([
            { ...examplePlan(), id: 'p1', updatedAt: '2026-09-27T00:00:00Z' },
        ]);
        await settle();

        // 200tr / (100.000 − 60.000) = 5.000 ghế
        expect(text()).toContain('5.000 ghế');
        expect(text()).toContain(
            'Báo cáo kết quả kinh doanh theo số dư đảm phí',
        );
        expect(text()).not.toContain('Có thay đổi chưa lưu');

        const price = el.querySelector<HTMLInputElement>('#plan-price')!;
        price.value = '80000';
        price.dispatchEvent(new Event('input'));
        await settle();

        // 200tr / (80.000 − 60.000) = 10.000 ghế
        expect(text()).toContain('10.000 ghế');
        expect(text()).toContain('Có thay đổi chưa lưu');
    });

    it('groups costs into variable and fixed sections and moves between them', async () => {
        http.expectOne(CVP_PLANS_API).flush([
            { ...examplePlan(), id: 'p1', updatedAt: '2026-09-27T00:00:00Z' },
        ]);
        await settle();

        const sections = () =>
            [...el.querySelectorAll('.cost-section')].map((s) => ({
                title: s
                    .querySelector('.cost-section__title')
                    ?.textContent?.trim(),
                items: s.querySelectorAll('.cost').length,
                // Intl dùng dấu cách không ngắt (U+00A0) trước "₫".
                total: s
                    .querySelector('.cost-section__total b')
                    ?.textContent?.replace(/ /g, ' ')
                    .trim(),
            }));
        expect(sections()).toEqual([
            { title: 'Biến phí (v)', items: 3, total: '60.000 ₫' },
            { title: 'Định phí (F)', items: 3, total: '200.000.000 ₫' },
        ]);

        // Chuyển "Nguyên vật liệu" (35.000) sang định phí:
        // v = 25.000, F = 200.035.000 ⇒ hòa vốn 200.035.000 / 75.000 ≈ 2.667,13
        el.querySelector<HTMLButtonElement>(
            '.cost-section .cost__action',
        )!.click();
        await settle();
        expect(sections().map((s) => s.items)).toEqual([2, 4]);
        expect(sections()[1]!.total).toBe('200.035.000 ₫');
        expect(text()).toContain('2.667,13 ghế');
    });
});
