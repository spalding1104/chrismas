import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import {
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth';
import { MIN_PASSWORD_LENGTH, messageOf, newPasswordRules } from './auth-form';

/** Đặt lại mật khẩu bằng mã bí mật của server (container). */
@Component({
    selector: 'app-forgot-password-page',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './forgot-password-page.html',
    styleUrl: './login-page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
    private readonly auth = inject(AuthStore);

    protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

    protected readonly form = inject(NonNullableFormBuilder).group(
        {
            email: ['', [Validators.required, Validators.email]],
            secret: ['', Validators.required],
            password: [''],
            confirm: [''],
        },
        { validators: newPasswordRules },
    );

    protected readonly submitting = signal(false);
    protected readonly submitted = signal(false);
    protected readonly done = signal(false);
    protected readonly serverError = signal<string | null>(null);
    protected readonly showPassword = signal(false);

    protected invalid(name: 'email' | 'secret'): boolean {
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

        const { email, secret, password } = this.form.getRawValue();
        this.submitting.set(true);
        try {
            await this.auth.resetPassword({ email, secret, password });
            this.done.set(true);
        } catch (err) {
            this.serverError.set(messageOf(err));
        } finally {
            this.submitting.set(false);
        }
    }
}
