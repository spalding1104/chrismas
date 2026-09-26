import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import {
    AbstractControl,
    NonNullableFormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthStore } from '../../core/auth';
import { SegmentOption, SegmentedControl } from '../../shared/ui';

type Mode = 'login' | 'register';

export const MIN_PASSWORD_LENGTH = 8;

/** Trang đăng nhập / đăng ký (container). */
@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule, SegmentedControl],
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
    private readonly auth = inject(AuthStore);
    private readonly router = inject(Router);
    private readonly fb = inject(NonNullableFormBuilder);

    protected readonly mode = signal<Mode>('login');
    protected readonly modeOptions: SegmentOption<Mode>[] = [
        { value: 'login', label: 'Đăng nhập' },
        { value: 'register', label: 'Đăng ký' },
    ];
    protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

    protected readonly submitting = signal(false);
    protected readonly submitted = signal(false);
    protected readonly serverError = signal<string | null>(null);
    protected readonly showPassword = signal(false);

    // Quy tắc chỉ áp dụng khi đăng ký; đăng nhập không lộ quy tắc mật khẩu.
    private readonly registerRules = (
        group: AbstractControl,
    ): ValidationErrors | null => {
        if (this.mode() !== 'register') return null;
        const { password, confirm } = group.value as {
            password: string;
            confirm: string;
        };
        const errors: ValidationErrors = {};
        if (password.length < MIN_PASSWORD_LENGTH) errors['tooShort'] = true;
        if (confirm !== password) errors['mismatch'] = true;
        return Object.keys(errors).length ? errors : null;
    };

    protected readonly form = this.fb.group(
        {
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
            confirm: [''],
        },
        { validators: this.registerRules },
    );

    constructor() {
        effect(() => {
            this.mode();
            untracked(() => {
                this.form.updateValueAndValidity();
                this.serverError.set(null);
                this.submitted.set(false);
            });
        });
    }

    protected invalid(name: 'email' | 'password'): boolean {
        const control = this.form.controls[name];
        return control.invalid && (control.touched || this.submitted());
    }

    protected groupError(key: 'tooShort' | 'mismatch'): boolean {
        return !!this.form.errors?.[key] && this.submitted();
    }

    protected async submit(): Promise<void> {
        this.submitted.set(true);
        this.serverError.set(null);
        if (this.form.invalid || this.submitting()) return;

        const { email, password } = this.form.getRawValue();
        this.submitting.set(true);
        try {
            if (this.mode() === 'login') {
                await this.auth.login({ email, password });
            } else {
                await this.auth.register({ email, password });
            }
            await this.router.navigateByUrl('/');
        } catch (err) {
            this.serverError.set(messageOf(err));
        } finally {
            this.submitting.set(false);
        }
    }
}

function messageOf(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
        if (err.status === 0 || err.status >= 500) {
            return 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.';
        }
        const message = (err.error as { error?: unknown } | null)?.error;
        if (typeof message === 'string') return message;
    }
    return 'Có lỗi xảy ra, vui lòng thử lại.';
}
