import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, ValidationErrors } from '@angular/forms';

export const MIN_PASSWORD_LENGTH = 8;

/** Validator của form có `password` + `confirm`: đủ dài và nhập lại khớp. */
export function newPasswordRules(
    group: AbstractControl,
): ValidationErrors | null {
    const { password, confirm } = group.value as {
        password: string;
        confirm: string;
    };
    const errors: ValidationErrors = {};
    if (password.length < MIN_PASSWORD_LENGTH) errors['tooShort'] = true;
    if (confirm !== password) errors['mismatch'] = true;
    return Object.keys(errors).length ? errors : null;
}

export function messageOf(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
        const message = (err.error as { error?: unknown } | null)?.error;
        // 503: server vẫn chạy nhưng chưa cấu hình gửi email.
        if (err.status === 503 && typeof message === 'string') return message;
        if (err.status === 0 || err.status >= 500) {
            return 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.';
        }
        if (typeof message === 'string') return message;
    }
    return 'Có lỗi xảy ra, vui lòng thử lại.';
}
