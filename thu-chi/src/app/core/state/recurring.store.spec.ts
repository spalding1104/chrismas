import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthStore } from '../auth/auth.store';
import { RecurringDraft, RecurringItem, User } from '../models';
import { RECURRING_API, RecurringStore } from './recurring.store';

describe('RecurringStore', () => {
    let store: RecurringStore;
    let http: HttpTestingController;
    const user = signal<User | null>({ id: 'a', email: 'a@test.vn' });

    const item: RecurringItem = {
        id: 'r1',
        type: 'expense',
        amount: 59_000,
        categoryId: 'subscriptions',
        note: 'Spotify',
        day: 5,
        startMonth: '2026-01',
        endMonth: null,
    };
    const draft: RecurringDraft = {
        type: 'expense',
        amount: 65_000,
        categoryId: 'subscriptions',
        note: 'Spotify',
        day: 5,
    };
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: AuthStore, useValue: { user } },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        store = TestBed.inject(RecurringStore);
        TestBed.tick();
        http.expectOne(RECURRING_API).flush([item]);
        await settle();
    });

    afterEach(() => http.verify());

    it('loads the signed-in user’s items', () => {
        expect(store.items()).toEqual([item]);
    });

    it('sends the start month on create and replaces the list', async () => {
        const done = store.add(draft, '2026-10');
        const req = http.expectOne(RECURRING_API);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ ...draft, startMonth: '2026-10' });
        req.flush([item, { ...item, id: 'r2' }]);
        expect(await done).toBe(true);
        expect(store.items().map((i) => i.id)).toEqual(['r1', 'r2']);
    });

    it('updates "from month" — the server may split one item into two', async () => {
        const done = store.update('r1', draft, '2026-10');
        const req = http.expectOne(`${RECURRING_API}/r1`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ ...draft, fromMonth: '2026-10' });
        req.flush([
            { ...item, endMonth: '2026-09' },
            { ...item, id: 'r2', amount: 65_000, startMonth: '2026-10' },
        ]);
        await done;
        expect(store.items().length).toBe(2);
    });

    it('stops an item from the viewed month', async () => {
        const done = store.remove('r1', '2026-10');
        const req = http.expectOne(
            (r) => r.url === `${RECURRING_API}/r1` && r.method === 'DELETE',
        );
        expect(req.request.params.get('from')).toBe('2026-10');
        req.flush([{ ...item, endMonth: '2026-09' }]);
        await done;
        expect(store.items()[0]!.endMonth).toBe('2026-09');
    });

    it('reports an error and keeps the list when the API fails', async () => {
        const done = store.add(draft, '2026-10');
        http.expectOne(RECURRING_API).flush('boom', {
            status: 500,
            statusText: 'Server Error',
        });
        expect(await done).toBe(false);
        expect(store.error()).toBe('Không lưu được khoản cố định');
        expect(store.items()).toEqual([item]);
    });
});
