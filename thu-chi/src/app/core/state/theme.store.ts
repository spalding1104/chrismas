import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

import { ThemeMode } from '../models';

/** Trùng với key trong đoạn script đầu `index.html`. */
export const THEME_STORAGE_KEY = 'thu-chi.theme';

const MODES: readonly ThemeMode[] = ['auto', 'light', 'dark'];

/** Chế độ giao diện, lưu lại cho lần mở sau. */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
    private readonly root = inject(DOCUMENT).documentElement;

    readonly mode = signal<ThemeMode>(readSaved());

    constructor() {
        effect(() => {
            const mode = this.mode();
            if (mode === 'auto') this.root.removeAttribute('data-theme');
            else this.root.setAttribute('data-theme', mode);
            try {
                localStorage.setItem(THEME_STORAGE_KEY, mode);
            } catch {
                /* bị chặn lưu trữ: vẫn đổi được trong phiên này */
            }
        });
    }

    cycle(): void {
        this.mode.update((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]);
    }
}

function readSaved(): ThemeMode {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        return MODES.includes(saved as ThemeMode)
            ? (saved as ThemeMode)
            : 'auto';
    } catch {
        return 'auto';
    }
}
