import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AUTH_API, AuthStore } from './auth.store';

describe('AuthStore', () => {
    let auth: AuthStore;
    let http: HttpTestingController;
    const alice = { id: 'a', email: 'a@test.vn' };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        auth = TestBed.inject(AuthStore);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('checks the session once and caches the answer', async () => {
        const first = auth.check();
        const second = auth.check();
        http.expectOne(`${AUTH_API}/me`).flush(alice);

        expect(await first).toEqual(alice);
        expect(await second).toEqual(alice);
        expect(auth.user()).toEqual(alice);
    });

    it('treats a 401 from /me as signed out', async () => {
        const checking = auth.check();
        http.expectOne(`${AUTH_API}/me`).flush(
            { error: 'Chưa đăng nhập' },
            { status: 401, statusText: 'Unauthorized' },
        );
        expect(await checking).toBeNull();
        expect(auth.user()).toBeNull();
    });

    it('logs in, then logs out even if the server call fails', async () => {
        const credentials = { email: 'a@test.vn', password: 'matkhau123' };
        const loggingIn = auth.login(credentials);
        const req = http.expectOne(`${AUTH_API}/login`);
        expect(req.request.body).toEqual(credentials);
        req.flush(alice);
        await loggingIn;
        expect(auth.user()).toEqual(alice);
        expect(await auth.check()).toEqual(alice);

        const loggingOut = auth.logout();
        http.expectOne(`${AUTH_API}/logout`).flush(null, {
            status: 500,
            statusText: 'Server Error',
        });
        await expect(loggingOut).rejects.toBeTruthy();
        expect(auth.user()).toBeNull();
    });

    const reset = {
        email: 'a@test.vn',
        secret: 'ma-bi-mat-123',
        password: 'matkhau123',
    };

    it('signs out after resetting the password', async () => {
        const loggingIn = auth.login({ email: 'a@test.vn', password: 'cu' });
        http.expectOne(`${AUTH_API}/login`).flush(alice);
        await loggingIn;

        const resetting = auth.resetPassword(reset);
        const req = http.expectOne(`${AUTH_API}/reset-password`);
        expect(req.request.body).toEqual(reset);
        req.flush(null, { status: 204, statusText: 'No Content' });
        await resetting;
        expect(auth.user()).toBeNull();
    });

    it('keeps the user when the secret is rejected', async () => {
        const loggingIn = auth.login({ email: 'a@test.vn', password: 'cu' });
        http.expectOne(`${AUTH_API}/login`).flush(alice);
        await loggingIn;

        const resetting = auth.resetPassword({ ...reset, secret: 'sai' });
        http.expectOne(`${AUTH_API}/reset-password`).flush(
            { error: 'Mã bí mật không đúng' },
            { status: 403, statusText: 'Forbidden' },
        );
        await expect(resetting).rejects.toBeTruthy();
        expect(auth.user()).toEqual(alice);
    });
});
