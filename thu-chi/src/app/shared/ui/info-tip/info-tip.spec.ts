import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoTip } from './info-tip';

@Component({
    imports: [InfoTip],
    template: `<app-info-tip
        label="Giá bán"
        text="Dòng 1
Dòng 2"
    />`,
})
class Host {}

describe('InfoTip', () => {
    let fixture: ComponentFixture<Host>;
    let host: HTMLElement;
    let button: HTMLButtonElement;

    const tip = () => fixture.nativeElement.querySelector('[role="tooltip"]');
    const fire = async (target: EventTarget, event: Event) => {
        target.dispatchEvent(event);
        await fixture.whenStable();
    };

    beforeEach(async () => {
        fixture = TestBed.createComponent(Host);
        await fixture.whenStable();
        host = fixture.nativeElement.querySelector('app-info-tip');
        button = host.querySelector('button')!;
    });

    it('is closed by default and labelled for screen readers', () => {
        expect(tip()).toBeNull();
        expect(button.getAttribute('aria-label')).toBe('Giải thích: Giá bán');
        expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens on hover and closes when the pointer leaves', async () => {
        await fire(host, new MouseEvent('mouseenter'));
        expect(tip()?.textContent).toContain('Dòng 1');
        expect(button.getAttribute('aria-describedby')).toBe(tip()?.id);

        await fire(host, new MouseEvent('mouseleave'));
        expect(tip()).toBeNull();
    });

    it('opens on keyboard focus or tap, closes on Escape or blur', async () => {
        await fire(button, new FocusEvent('focus'));
        expect(tip()).not.toBeNull();
        await fire(host, new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(tip()).toBeNull();

        await fire(button, new MouseEvent('click'));
        expect(tip()).not.toBeNull();
        await fire(button, new MouseEvent('click'));
        expect(tip()).not.toBeNull();
        await fire(button, new FocusEvent('blur'));
        expect(tip()).toBeNull();
    });
});
