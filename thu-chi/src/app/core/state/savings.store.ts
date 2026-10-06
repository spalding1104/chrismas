import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { SavingsGoal } from '../models';

export const SAVINGS_API = '/api/savings-goals';

/**
 * Mục tiêu tiết kiệm theo tháng của tài khoản đang đăng nhập. Backend trả
 * cả danh sách sau mỗi lần ghi (đặt từ tháng X xóa các dòng sau X), nên
 * store chỉ việc thay thế. Tra mục tiêu của một tháng bằng `goalFor`.
 */
@Injectable({ providedIn: 'root' })
export class SavingsStore {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthStore);

    private readonly _goals = signal<SavingsGoal[]>([]);
    private readonly _error = signal<string | null>(null);

    readonly goals = this._goals.asReadonly();
    readonly error = this._error.asReadonly();

    constructor() {
        // Cùng cách với TransactionStore: đổi tài khoản thì bỏ dữ liệu cũ
        // ngay rồi mới tải của người mới.
        effect(() => {
            const user = this.auth.user();
            untracked(() => {
                this._goals.set([]);
                this._error.set(null);
                if (user) void this.load();
            });
        });
    }

    load(): Promise<boolean> {
        const user = this.auth.user();
        return this.run('Không tải được mục tiêu tiết kiệm', async () => {
            const list = await firstValueFrom(
                this.http.get<SavingsGoal[]>(SAVINGS_API),
            );
            if (this.auth.user() === user) this._goals.set(list);
        });
    }

    /** Đặt mục tiêu từ `month` trở đi; `amount = 0` = bỏ mục tiêu. */
    set(month: string, amount: number): Promise<boolean> {
        return this.run('Không lưu được mục tiêu tiết kiệm', async () => {
            this._goals.set(
                await firstValueFrom(
                    this.http.put<SavingsGoal[]>(`${SAVINGS_API}/${month}`, {
                        amount,
                    }),
                ),
            );
        });
    }

    private async run(
        errorMessage: string,
        action: () => Promise<void>,
    ): Promise<boolean> {
        try {
            await action();
            this._error.set(null);
            return true;
        } catch {
            this._error.set(errorMessage);
            return false;
        }
    }
}
