import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { LOGIN_URL } from './auth.guards';
import { AUTH_API, AuthStore } from './auth.store';

/** Phiên hết hạn giữa chừng (API trả 401) → đưa về trang đăng nhập. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    return next(req).pipe(
        catchError((err: unknown) => {
            if (
                err instanceof HttpErrorResponse &&
                err.status === 401 &&
                !req.url.startsWith(AUTH_API)
            ) {
                auth.signedOut();
                void router.navigateByUrl(LOGIN_URL);
            }
            return throwError(() => err);
        }),
    );
};
