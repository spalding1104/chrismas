import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
    Router,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
} from '@angular/router';

import { AuthStore, LOGIN_URL } from './core/auth';
import { ThemeStore } from './core/state/theme.store';
import { ThemeToggle } from './shared/ui';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
    template: `
        <header class="topbar">
            <div class="topbar__inner">
                <div class="brand">
                    <span class="brand__mark" aria-hidden="true">₫</span>
                    <div>
                        <h1 class="brand__name">Sổ Thu Chi</h1>
                        <p class="brand__tag">
                            Quản lý tiền vào, tiền ra mỗi tháng
                        </p>
                    </div>
                </div>

                @if (auth.user(); as user) {
                    <nav class="modules" aria-label="Phân hệ">
                        <!-- "Chi tiêu" gồm cả / và /nam nên sáng khi không ở Kế toán. -->
                        <a
                            class="module"
                            routerLink="/"
                            [class.module--active]="!accounting.isActive"
                            [attr.aria-current]="
                                accounting.isActive ? null : 'page'
                            "
                            >Chi tiêu</a
                        >
                        <a
                            class="module"
                            routerLink="/ke-toan"
                            routerLinkActive="module--active"
                            ariaCurrentWhenActive="page"
                            #accounting="routerLinkActive"
                            >Kế toán</a
                        >
                    </nav>

                    <div class="account">
                        <span class="account__email" [title]="user.email">
                            {{ user.email }}
                        </span>
                        <button
                            type="button"
                            class="btn btn--ghost btn--sm"
                            (click)="logout()"
                        >
                            Đăng xuất
                        </button>
                    </div>
                }
            </div>
        </header>
        <main class="page">
            <router-outlet />
        </main>
        <footer class="footer">
            <div class="footer__inner">
                <app-theme-toggle
                    [mode]="theme.mode()"
                    (next)="theme.cycle()"
                />
                <p class="footer__text">
                    © {{ year }} Sổ Thu Chi · Quản lý thu chi cá nhân
                </p>
            </div>
        </footer>
    `,
    styleUrl: './app.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
    protected readonly auth = inject(AuthStore);
    protected readonly theme = inject(ThemeStore);
    private readonly router = inject(Router);

    protected readonly year = new Date().getFullYear();

    protected async logout(): Promise<void> {
        await this.auth.logout();
        await this.router.navigateByUrl(LOGIN_URL);
    }
}
