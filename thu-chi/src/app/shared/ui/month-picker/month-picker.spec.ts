import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthPicker } from './month-picker';

@Component({
    imports: [MonthPicker],
    template: `<app-month-picker [(month)]="month" />`,
})
class Host {
    readonly month = signal('2026-03');
}

describe('MonthPicker', () => {
    let fixture: ComponentFixture<Host>;
    let el: HTMLElement;

    const trigger = () =>
        el.querySelector<HTMLButtonElement>('.label--button')!;
    const panel = () => el.querySelector('.panel');
    const click = async (target: HTMLElement) => {
        target.click();
        await fixture.whenStable();
    };

    beforeEach(async () => {
        fixture = TestBed.createComponent(Host);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    it('picks a month of another year from the panel', async () => {
        await click(trigger());
        expect(panel()).not.toBeNull();
        expect(el.querySelector('.month--selected')?.textContent).toContain(
            'Tháng 3',
        );

        await click(el.querySelector<HTMLElement>('[aria-label="Năm trước"]')!);
        expect(el.querySelector('.panel__year')?.textContent).toBe('2025');

        const months = el.querySelectorAll<HTMLElement>('.month');
        await click(months[10]);

        expect(fixture.componentInstance.month()).toBe('2025-11');
        expect(panel()).toBeNull();
        expect(trigger().textContent).toContain('Tháng 11, 2025');
    });

    it('closes on Escape and on a click outside', async () => {
        await click(trigger());
        el.querySelector('app-month-picker')!.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
        await fixture.whenStable();
        expect(panel()).toBeNull();

        await click(trigger());
        document.body.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true }),
        );
        await fixture.whenStable();
        expect(panel()).toBeNull();
        expect(fixture.componentInstance.month()).toBe('2026-03');
    });
});
