import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';
import { AuthStore } from './core/auth';
import { User } from './core/models';

describe('App', () => {
    const user = signal<User | null>(null);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter(routes),
                {
                    provide: AuthStore,
                    useValue: { user, check: async () => user() },
                },
            ],
        }).compileComponents();
    });

    async function render(url: string) {
        const fixture = TestBed.createComponent(App);
        const router = TestBed.inject(Router);
        await router.navigateByUrl(url);
        await fixture.whenStable();
        return { el: fixture.nativeElement as HTMLElement, router };
    }

    describe('when signed out', () => {
        beforeEach(() => user.set(null));

        it('redirects protected pages to the login page', async () => {
            const { el, router } = await render('/nam');
            expect(router.url).toBe('/dang-nhap');
            expect(el.querySelector('app-login-page')).not.toBeNull();
            expect(el.querySelector('.tabs')).toBeNull();
            expect(el.querySelector('app-month-picker')).toBeNull();
        });
    });

    describe('when signed in', () => {
        beforeEach(() => user.set({ id: 'a', email: 'a@test.vn' }));

        it('renders the month view with the account in the header', async () => {
            const { el } = await render('/');
            expect(el.querySelector('h1')?.textContent).toContain('Sổ Thu Chi');
            expect(el.querySelector('app-dashboard-page')).not.toBeNull();
            expect(el.querySelectorAll('app-stat-card').length).toBe(3);
            expect(el.querySelector('.account__email')?.textContent).toContain(
                'a@test.vn',
            );
        });

        it('switches the header picker on the year view', async () => {
            const { el } = await render('/nam');
            expect(el.querySelector('app-year-report-page')).not.toBeNull();
            expect(el.querySelector('app-year-picker')).not.toBeNull();
            expect(el.querySelector('app-month-picker')).toBeNull();
        });

        it('keeps the theme toggle in the footer, not the header', async () => {
            const { el } = await render('/');
            expect(el.querySelector('footer app-theme-toggle')).not.toBeNull();
            expect(el.querySelector('header app-theme-toggle')).toBeNull();
        });

        it('puts the view tabs and period picker below the header', async () => {
            const { el } = await render('/');
            expect(el.querySelector('main .toolbar .tabs')).not.toBeNull();
            expect(
                el.querySelector('main .toolbar app-month-picker'),
            ).not.toBeNull();
            expect(el.querySelector('header .tabs')).toBeNull();
            expect(el.querySelector('header app-month-picker')).toBeNull();
        });

        it('shows a decorative illustration instead of a module switch', async () => {
            const { el } = await render('/');
            const art = el.querySelector('header svg.art');
            expect(art?.getAttribute('aria-hidden')).toBe('true');
            expect(el.querySelector('header .modules')).toBeNull();
            // Logo dẫn về trang chính, thay cho nút "Chi tiêu" cũ.
            expect(
                el.querySelector('header a.brand')?.getAttribute('href'),
            ).toBe('/');
        });

        it('still serves the accounting page at /ke-toan', async () => {
            const { el } = await render('/ke-toan');
            expect(el.querySelector('app-accounting-page')).not.toBeNull();
            expect(el.querySelector('main .toolbar')).toBeNull();
        });

        it('sends a signed-in user away from the login page', async () => {
            const { router } = await render('/dang-nhap');
            expect(router.url).toBe('/');
        });
    });
});
