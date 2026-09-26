import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
    let fixture: ComponentFixture<LoginPage>;
    let el: HTMLElement;
    let auth: {
        login: ReturnType<typeof vi.fn>;
        register: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        auth = {
            login: vi.fn().mockResolvedValue(undefined),
            register: vi.fn().mockResolvedValue(undefined),
        };
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AuthStore, useValue: auth },
            ],
        });
        vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(
            true,
        );
        fixture = TestBed.createComponent(LoginPage);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    const type = (selector: string, value: string) => {
        const input = el.querySelector<HTMLInputElement>(selector)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };
    const switchTo = async (label: string) => {
        [...el.querySelectorAll<HTMLButtonElement>('.segment')]
            .find((b) => b.textContent?.includes(label))!
            .click();
        await fixture.whenStable();
    };

    it('logs in and goes to the dashboard', async () => {
        type('#auth-email', 'a@test.vn');
        type('#auth-password', 'bat-ky');
        await submit();

        expect(auth.login).toHaveBeenCalledWith({
            email: 'a@test.vn',
            password: 'bat-ky',
        });
        expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('does not submit an invalid form', async () => {
        type('#auth-email', 'khong-phai-email');
        await submit();
        expect(auth.login).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Nhập email hợp lệ');
        expect(el.textContent).toContain('Nhập mật khẩu');
    });

    it('checks password length and confirmation when registering', async () => {
        await switchTo('Đăng ký');
        type('#auth-email', 'b@test.vn');
        type('#auth-password', 'ngan');
        type('#auth-confirm', 'khac');
        await submit();
        expect(auth.register).not.toHaveBeenCalled();
        expect(el.textContent).toContain('ít nhất 8 ký tự');

        type('#auth-password', 'matkhau123');
        await fixture.whenStable();
        expect(el.textContent).toContain('không khớp');

        type('#auth-confirm', 'matkhau123');
        await submit();
        expect(auth.register).toHaveBeenCalledWith({
            email: 'b@test.vn',
            password: 'matkhau123',
        });
    });

    it('shows the server message when login fails', async () => {
        auth.login.mockRejectedValue(
            new HttpErrorResponse({
                status: 401,
                error: { error: 'Email hoặc mật khẩu không đúng' },
            }),
        );
        type('#auth-email', 'a@test.vn');
        type('#auth-password', 'sai');
        await submit();
        expect(el.querySelector('[role="alert"]')?.textContent).toContain(
            'Email hoặc mật khẩu không đúng',
        );
    });
});
