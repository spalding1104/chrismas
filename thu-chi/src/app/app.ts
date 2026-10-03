import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthStore, LOGIN_URL } from './core/auth';
import { ThemeStore } from './core/state/theme.store';
import { ThemeToggle } from './shared/ui';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, ThemeToggle],
    template: `
        <header class="topbar">
            <div class="topbar__inner">
                <!--
                    Logo = hình minh họa + chữ "Sổ Thu Chi", bấm để về trang
                    chính. Header không còn công tắc Chi tiêu | Kế toán (trang
                    Kế toán vẫn vào được qua /ke-toan). Hình: 3 chồng xu cao
                    dần + mũi tên đi lên + vài đốm lấp lánh; màu lấy từ token
                    nên tự đổi theo sáng/tối.
                -->
                <a class="brand" routerLink="/">
                    <svg
                        class="art"
                        viewBox="0 0 112 40"
                        aria-hidden="true"
                        focusable="false"
                    >
                        @for (stack of coinStacks; track stack.x) {
                            @for (i of stack.coins; track i) {
                                <rect
                                    class="art__coin"
                                    [attr.x]="stack.x - 9"
                                    [attr.y]="32 - i * 5"
                                    width="18"
                                    height="5"
                                    rx="2.5"
                                />
                                <ellipse
                                    class="art__coin-top"
                                    [attr.cx]="stack.x"
                                    [attr.cy]="32 - i * 5"
                                    rx="9"
                                    ry="2"
                                />
                            }
                        }
                        <polyline
                            class="art__trend"
                            points="6,24 30,19 54,13 80,6"
                        />
                        <polygon
                            class="art__arrow"
                            points="87,4.2 79.1,2.6 80.9,9.4"
                        />
                        @for (s of sparkles; track s.x) {
                            <path
                                class="art__sparkle"
                                [style.animation-delay.s]="s.delay"
                                [attr.d]="sparklePath(s.x, s.y, s.r)"
                            />
                        }
                    </svg>
                    <h1 class="brand__name">Sổ Thu Chi</h1>
                </a>

                @if (auth.user(); as user) {
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

    // Hình minh họa trong logo (toạ độ trong viewBox 112×40).
    protected readonly coinStacks = [
        { x: 14, coins: [0, 1] },
        { x: 38, coins: [0, 1, 2] },
        { x: 62, coins: [0, 1, 2, 3] },
    ];
    protected readonly sparkles = [
        { x: 97, y: 9, r: 4.5, delay: 0 },
        { x: 107, y: 21, r: 3.2, delay: 0.8 },
        { x: 92, y: 30, r: 2.8, delay: 1.6 },
    ];

    /** Ngôi sao 4 cánh tâm (x, y), bán kính r. */
    protected sparklePath(x: number, y: number, r: number): string {
        return (
            `M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} ` +
            `Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r}Z`
        );
    }

    protected async logout(): Promise<void> {
        await this.auth.logout();
        await this.router.navigateByUrl(LOGIN_URL);
    }
}
