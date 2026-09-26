import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { User } from '../models';

export const AUTH_API = '/api/auth';

export interface Credentials {
    email: string;
    password: string;
}

/**
 * Người dùng đang đăng nhập. Phiên nằm trong cookie HttpOnly do server
 * đặt, nên frontend không bao giờ đọc hay lưu token.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
    private readonly http = inject(HttpClient);

    private readonly _user = signal<User | null>(null);
    readonly user = this._user.asReadonly();

    private checked: Promise<User | null> | null = null;

    /** Hỏi server phiên hiện tại; chỉ gọi mạng lần đầu, các lần sau dùng lại. */
    check(): Promise<User | null> {
        this.checked ??= firstValueFrom(
            this.http.get<User>(`${AUTH_API}/me`),
        ).then(
            (user) => this.setUser(user),
            () => this.setUser(null),
        );
        return this.checked;
    }

    async login(credentials: Credentials): Promise<void> {
        this.setUser(
            await firstValueFrom(
                this.http.post<User>(`${AUTH_API}/login`, credentials),
            ),
        );
    }

    async register(credentials: Credentials): Promise<void> {
        this.setUser(
            await firstValueFrom(
                this.http.post<User>(`${AUTH_API}/register`, credentials),
            ),
        );
    }

    async logout(): Promise<void> {
        try {
            await firstValueFrom(this.http.post(`${AUTH_API}/logout`, null));
        } finally {
            this.setUser(null);
        }
    }

    /** Gọi khi server báo phiên đã hết hạn (401). */
    signedOut(): void {
        this.setUser(null);
    }

    private setUser(user: User | null): User | null {
        this._user.set(user);
        this.checked = Promise.resolve(user);
        return user;
    }
}
