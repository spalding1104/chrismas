import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { RecurringDraft, RecurringItem } from '../models';

export const RECURRING_API = '/api/recurring';

/**
 * Các khoản thu/chi cố định hằng tháng của tài khoản đang đăng nhập.
 * Backend trả cả danh sách sau mỗi thao tác ghi (vì sửa/ngừng "từ tháng X"
 * có thể tách một dòng thành hai), nên store chỉ việc thay thế.
 * TransactionStore đọc `items` để tính khoản cố định vào từng tháng.
 */
@Injectable({ providedIn: 'root' })
export class RecurringStore {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthStore);

    private readonly _items = signal<RecurringItem[]>([]);
    private readonly _error = signal<string | null>(null);

    readonly items = this._items.asReadonly();
    readonly error = this._error.asReadonly();

    constructor() {
        // Cùng cách với TransactionStore: đổi tài khoản thì bỏ dữ liệu cũ
        // ngay rồi mới tải của người mới.
        effect(() => {
            const user = this.auth.user();
            untracked(() => {
                this._items.set([]);
                this._error.set(null);
                if (user) void this.load();
            });
        });
    }

    load(): Promise<boolean> {
        const user = this.auth.user();
        return this.run('Không tải được khoản cố định', async () => {
            const list = await firstValueFrom(
                this.http.get<RecurringItem[]>(RECURRING_API),
            );
            if (this.auth.user() === user) this._items.set(list);
        });
    }

    /** Thêm một khoản, áp dụng từ `startMonth` trở đi. */
    add(draft: RecurringDraft, startMonth: string): Promise<boolean> {
        return this.run('Không lưu được khoản cố định', async () => {
            this._items.set(
                await firstValueFrom(
                    this.http.post<RecurringItem[]>(RECURRING_API, {
                        ...draft,
                        startMonth,
                    }),
                ),
            );
        });
    }

    /** Sửa từ `fromMonth` trở đi; các tháng trước giữ số cũ. */
    update(
        id: string,
        draft: RecurringDraft,
        fromMonth: string,
    ): Promise<boolean> {
        return this.run('Không lưu được khoản cố định', async () => {
            this._items.set(
                await firstValueFrom(
                    this.http.put<RecurringItem[]>(`${RECURRING_API}/${id}`, {
                        ...draft,
                        fromMonth,
                    }),
                ),
            );
        });
    }

    /** Ngừng từ `fromMonth`; các tháng trước vẫn còn khoản này. */
    remove(id: string, fromMonth: string): Promise<boolean> {
        return this.run('Không xóa được khoản cố định', async () => {
            this._items.set(
                await firstValueFrom(
                    this.http.delete<RecurringItem[]>(
                        `${RECURRING_API}/${id}`,
                        { params: { from: fromMonth } },
                    ),
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
