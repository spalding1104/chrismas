import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthStore } from '../auth/auth.store';
import { SavingsGoal, User } from '../models';
import { SAVINGS_API, SavingsStore } from './savings.store';

describe('SavingsStore', () => {
    let store: SavingsStore;
    let http: HttpTestingController;
    const user = signal<User | null>({ id: 'a', email: 'a@test.vn' });
    const goal: SavingsGoal = { month: '2026-08', amount: 5_000_000 };
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    beforeEach(async () => {
        user.set({ id: 'a', email: 'a@test.vn' });
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: AuthStore, useValue: { user } },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        store = TestBed.inject(SavingsStore);
        TestBed.tick();
        http.expectOne(SAVINGS_API).flush([goal]);
        await settle();
    });

    afterEach(() => http.verify());

    it('loads the signed-in user’s goals', () => {
        expect(store.goals()).toEqual([goal]);
    });

    it('sets a goal from a month and replaces the list', async () => {
        const done = store.set('2026-10', 6_000_000);
        const req = http.expectOne(`${SAVINGS_API}/2026-10`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ amount: 6_000_000 });
        req.flush([goal, { month: '2026-10', amount: 6_000_000 }]);
        expect(await done).toBe(true);
        expect(store.goals().length).toBe(2);
    });

    it('reports a failed save', async () => {
        const done = store.set('2026-10', 6_000_000);
        http.expectOne(`${SAVINGS_API}/2026-10`).flush('x', {
            status: 500,
            statusText: 'Server Error',
        });
        expect(await done).toBe(false);
        expect(store.error()).toBe('Không lưu được mục tiêu tiết kiệm');
        expect(store.goals()).toEqual([goal]);
    });

    it('drops the goals when the account signs out', async () => {
        user.set(null);
        TestBed.tick();
        expect(store.goals()).toEqual([]);
    });
});
