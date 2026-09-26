import { TestBed } from '@angular/core/testing';

import { THEME_STORAGE_KEY, ThemeStore } from './theme.store';

describe('ThemeStore', () => {
    const root = document.documentElement;

    beforeEach(() => {
        localStorage.clear();
        root.removeAttribute('data-theme');
    });

    it('defaults to following the system', () => {
        TestBed.inject(ThemeStore);
        TestBed.tick();
        expect(root.hasAttribute('data-theme')).toBe(false);
    });

    it('cycles auto → light → dark → auto and remembers the choice', () => {
        const theme = TestBed.inject(ThemeStore);

        theme.cycle();
        TestBed.tick();
        expect(root.getAttribute('data-theme')).toBe('light');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

        theme.cycle();
        TestBed.tick();
        expect(root.getAttribute('data-theme')).toBe('dark');

        theme.cycle();
        TestBed.tick();
        expect(root.hasAttribute('data-theme')).toBe(false);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('auto');
    });

    it('restores a saved choice and ignores junk values', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        expect(TestBed.inject(ThemeStore).mode()).toBe('dark');

        TestBed.resetTestingModule();
        localStorage.setItem(THEME_STORAGE_KEY, 'purple');
        expect(TestBed.inject(ThemeStore).mode()).toBe('auto');
    });
});
