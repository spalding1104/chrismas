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
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth';
import { SegmentOption, SegmentedControl } from '../../shared/ui';
import { MIN_PASSWORD_LENGTH, messageOf, newPasswordRules } from './auth-form';

type Mode = 'login' | 'register';

/** Trang đăng nhập / đăng ký (container). */
@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule, RouterLink, SegmentedControl],
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
    ): ValidationErrors | null =>
        this.mode() === 'register' ? newPasswordRules(group) : null;

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
