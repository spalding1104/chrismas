import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthStore } from '../auth/auth.store';
import { CvpPlan, User } from '../models';
import { CVP_PLANS_API, CvpStore, blankPlan, examplePlan } from './cvp.store';

describe('CvpStore', () => {
    let store: CvpStore;
    let http: HttpTestingController;
    const user = signal<User | null>({ id: 'a', email: 'a@test.vn' });
    const plan = (id: string, name: string): CvpPlan => ({
        ...blankPlan(name),
        id,
        updatedAt: '2026-09-27T00:00:00.000Z',
    });

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
        store = TestBed.inject(CvpStore);
        TestBed.tick();
        http.expectOne(CVP_PLANS_API).flush([
            plan('1', 'Một'),
            plan('2', 'Hai'),
        ]);
        await new Promise((r) => setTimeout(r));
    });

    afterEach(() => http.verify());

    it('loads plans and selects the first by default', () => {
        expect(store.loaded()).toBe(true);
        expect(store.selected()?.id).toBe('1');
        store.selectedId.set('2');
        expect(store.selected()?.name).toBe('Hai');
    });

    it('creates, saves and removes plans', async () => {
        const creating = store.create(examplePlan());
        const post = http.expectOne({ method: 'POST', url: CVP_PLANS_API });
        expect(post.request.body.costItems.length).toBe(6);
        post.flush({ ...plan('3', 'Ví dụ'), ...examplePlan() });
        expect(await creating).toBe(true);
        expect(store.selected()?.id).toBe('3');

        const saving = store.save('3', { ...examplePlan(), unitPrice: 1 });
        http.expectOne({ method: 'PUT', url: `${CVP_PLANS_API}/3` }).flush({
            ...plan('3', 'Ví dụ'),
            unitPrice: 1,
        });
        expect(await saving).toBe(true);
        expect(store.selected()?.unitPrice).toBe(1);

        const removing = store.remove('3');
        http.expectOne({ method: 'DELETE', url: `${CVP_PLANS_API}/3` }).flush(
            null,
        );
        await removing;
        expect(store.plans().map((p) => p.id)).toEqual(['1', '2']);
        expect(store.selected()?.id).toBe('1');
    });

    it('reports failure and clears everything on logout', async () => {
        const saving = store.save('1', blankPlan());
        http.expectOne(`${CVP_PLANS_API}/1`).flush(null, {
            status: 500,
            statusText: 'Error',
        });
        expect(await saving).toBe(false);
        expect(store.error()).toBe('Không lưu được phương án');

        user.set(null);
        TestBed.tick();
        expect(store.plans()).toEqual([]);
        expect(store.loaded()).toBe(false);
    });
});
