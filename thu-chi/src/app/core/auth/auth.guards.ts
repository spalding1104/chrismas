import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';

export const LOGIN_URL = '/dang-nhap';

// inject() phải gọi trước await/then (ngoài đó không còn injection context).

/** Trang cần đăng nhập. */
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    return auth
        .check()
        .then((user) => user !== null || router.parseUrl(LOGIN_URL));
};

/** Trang đăng nhập: đã đăng nhập rồi thì về trang chính. */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    return auth.check().then((user) => user === null || router.parseUrl('/'));
};
