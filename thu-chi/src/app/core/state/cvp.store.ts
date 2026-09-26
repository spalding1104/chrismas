import { HttpClient } from '@angular/common/http';
import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { CvpPlan, CvpPlanInput } from '../models';

export const CVP_PLANS_API = '/api/cvp-plans';

/** Phương án trống khi bấm "Phương án mới". */
export function blankPlan(name = 'Phương án mới'): CvpPlanInput {
    return {
        name,
        unitLabel: 'sp',
        unitPrice: 0,
        volume: 0,
        taxRate: 20,
        targetProfit: null,
        targetAfterTax: true,
        costItems: [],
    };
}

/** Ví dụ có sẵn số liệu để xem thử cách tính (khớp ví dụ trong cvp.spec.ts). */
export function examplePlan(): CvpPlanInput {
    return {
        name: 'Ví dụ: xưởng sản xuất ghế',
        unitLabel: 'ghế',
        unitPrice: 100_000,
        volume: 8_000,
        taxRate: 20,
        targetProfit: 120_000_000,
        targetAfterTax: true,
        costItems: [
            {
                id: 'nvl',
                name: 'Nguyên vật liệu trực tiếp',
                behavior: 'variable',
                amount: 35_000,
            },
            {
                id: 'nc',
                name: 'Nhân công trực tiếp',
                behavior: 'variable',
                amount: 20_000,
            },
            {
                id: 'hh',
                name: 'Hoa hồng bán hàng',
                behavior: 'variable',
                amount: 5_000,
            },
            {
                id: 'thue',
                name: 'Thuê nhà xưởng',
                behavior: 'fixed',
                amount: 120_000_000,
            },
            {
                id: 'kh',
                name: 'Khấu hao máy móc',
                behavior: 'fixed',
                amount: 50_000_000,
            },
            {
                id: 'ql',
                name: 'Lương quản lý',
                behavior: 'fixed',
                amount: 30_000_000,
            },
        ],
    };
}

/**
 * Ví dụ quán cà phê, kỳ = 1 tháng (khớp cvp.spec.ts). Hòa vốn ra số lẻ
 * (2.045,45 ly) để thấy cách làm tròn lên "bán tối thiểu 2.046 ly".
 */
export function coffeeShopPlan(): CvpPlanInput {
    return {
        name: 'Ví dụ: quán cà phê (theo tháng)',
        unitLabel: 'ly',
        unitPrice: 35_000,
        volume: 3_000,
        taxRate: 20,
        targetProfit: 20_000_000,
        targetAfterTax: true,
        costItems: [
            {
                id: 'nl',
                name: 'Cà phê, sữa, đá',
                behavior: 'variable',
                amount: 9_000,
            },
            {
                id: 'bb',
                name: 'Ly, nắp, ống hút',
                behavior: 'variable',
                amount: 2_500,
            },
            {
                id: 'app',
                name: 'Phí app giao hàng, thanh toán (bình quân)',
                behavior: 'variable',
                amount: 1_500,
            },
            {
                id: 'mb',
                name: 'Thuê mặt bằng',
                behavior: 'fixed',
                amount: 15_000_000,
            },
            {
                id: 'nv',
                name: 'Lương nhân viên',
                behavior: 'fixed',
                amount: 24_000_000,
            },
            {
                id: 'dn',
                name: 'Điện, nước, internet',
                behavior: 'fixed',
                amount: 4_000_000,
            },
            {
                id: 'kh',
                name: 'Khấu hao máy pha, quầy',
                behavior: 'fixed',
                amount: 2_000_000,
            },
        ],
    };
}

/** Các ví dụ mẫu người dùng có thể thêm vào danh sách phương án. */
export const EXAMPLES = [
    { id: 'chair', label: 'Xưởng sản xuất ghế', build: examplePlan },
    { id: 'coffee', label: 'Quán cà phê', build: coffeeShopPlan },
] as const;

export type ExampleId = (typeof EXAMPLES)[number]['id'];

/** Các phương án CVP của tài khoản đang đăng nhập. */
@Injectable({ providedIn: 'root' })
export class CvpStore {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthStore);

    private readonly _plans = signal<CvpPlan[]>([]);
    private readonly _error = signal<string | null>(null);
    private readonly _loaded = signal(false);

    readonly plans = this._plans.asReadonly();
    readonly error = this._error.asReadonly();
    readonly loaded = this._loaded.asReadonly();
    readonly selectedId = signal<string | null>(null);

    readonly selected = computed<CvpPlan | null>(
        () =>
            this._plans().find((p) => p.id === this.selectedId()) ??
            this._plans()[0] ??
            null,
    );

    constructor() {
        effect(() => {
            const user = this.auth.user();
            untracked(() => {
                this._plans.set([]);
                this._loaded.set(false);
                this.selectedId.set(null);
                if (user) void this.load();
            });
        });
    }

    load(): Promise<boolean> {
        const user = this.auth.user();
        return this.run('Không tải được các phương án', async () => {
            const plans = await firstValueFrom(
                this.http.get<CvpPlan[]>(CVP_PLANS_API),
            );
            if (this.auth.user() !== user) return;
            this._plans.set(plans);
            this._loaded.set(true);
        });
    }

    create(input: CvpPlanInput): Promise<boolean> {
        return this.run('Không tạo được phương án', async () => {
            const plan = await firstValueFrom(
                this.http.post<CvpPlan>(CVP_PLANS_API, input),
            );
            this._plans.update((list) => [...list, plan]);
            this.selectedId.set(plan.id);
        });
    }

    save(id: string, input: CvpPlanInput): Promise<boolean> {
        return this.run('Không lưu được phương án', async () => {
            const plan = await firstValueFrom(
                this.http.put<CvpPlan>(`${CVP_PLANS_API}/${id}`, input),
            );
            this._plans.update((list) =>
                list.map((p) => (p.id === id ? plan : p)),
            );
        });
    }

    remove(id: string): Promise<boolean> {
        return this.run('Không xóa được phương án', async () => {
            await firstValueFrom(
                this.http.delete<void>(`${CVP_PLANS_API}/${id}`),
            );
            this._plans.update((list) => list.filter((p) => p.id !== id));
            if (this.selectedId() === id) this.selectedId.set(null);
        });
    }

    /** true nếu thành công (vd. để form biết đã lưu xong). */
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
