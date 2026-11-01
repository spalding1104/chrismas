import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth';
import { ForgotPasswordPage } from './forgot-password-page';

describe('ForgotPasswordPage', () => {
    let fixture: ComponentFixture<ForgotPasswordPage>;
    let el: HTMLElement;
    let auth: { resetPassword: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        auth = { resetPassword: vi.fn().mockResolvedValue(undefined) };
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AuthStore, useValue: auth },
            ],
        });
        fixture = TestBed.createComponent(ForgotPasswordPage);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    const type = (selector: string, value: string) => {
        const input = el.querySelector<HTMLInputElement>(selector)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
    };
    const fill = (password = 'matkhau123', confirm = password) => {
        type('#forgot-email', 'a@test.vn');
        type('#forgot-secret', 'ma-bi-mat-123');
        type('#forgot-password', password);
        type('#forgot-confirm', confirm);
    };
    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    it('resets with the secret, then offers to log in', async () => {
        fill();
        await submit();

        expect(auth.resetPassword).toHaveBeenCalledWith({
            email: 'a@test.vn',
            secret: 'ma-bi-mat-123',
            password: 'matkhau123',
        });
        expect(el.querySelector('[role="status"]')?.textContent).toContain(
            'Đã đổi mật khẩu',
        );
        expect(el.querySelector('form')).toBeNull();
    });

    it('requires a valid email and the secret', async () => {
        type('#forgot-email', 'khong-phai-email');
        await submit();
        expect(auth.resetPassword).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Nhập email hợp lệ');
        expect(el.textContent).toContain('Nhập mã bí mật');
    });

    it('checks password length and confirmation', async () => {
        fill('ngan', 'khac');
        await submit();
        expect(auth.resetPassword).not.toHaveBeenCalled();
        expect(el.textContent).toContain('ít nhất 8 ký tự');
        expect(el.textContent).toContain('không khớp');
    });

    it('keeps the form and shows the server message on failure', async () => {
        auth.resetPassword.mockRejectedValue(
            new HttpErrorResponse({
                status: 403,
                error: { error: 'Mã bí mật không đúng' },
            }),
        );
        fill();
        await submit();
        expect(el.querySelector('[role="alert"]')?.textContent).toContain(
            'Mã bí mật không đúng',
        );
        expect(el.querySelector('form')).not.toBeNull();
    });
});
