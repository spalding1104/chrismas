import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Injector,
    afterNextRender,
    inject,
    input,
    signal,
    viewChild,
} from '@angular/core';

let nextId = 0;

/** Khoảng cách tối thiểu từ tooltip tới mép màn hình, px. */
const EDGE = 8;

/**
 * Nút "i" hiện lời giải thích khi rê chuột, focus bằng bàn phím, hoặc
 * chạm (điện thoại). Esc để đóng. Tooltip tự dịch vào trong nếu chạm mép.
 */
@Component({
    selector: 'app-info-tip',
    template: `
        <button
            type="button"
            class="icon"
            [attr.aria-label]="'Giải thích: ' + label()"
            [attr.aria-expanded]="open()"
            [attr.aria-describedby]="open() ? id : null"
            (focus)="show()"
            (blur)="hide()"
            (click)="show()"
        >
            <!-- Vẽ bằng SVG: chữ "i" của font có lề trái/phải không đều nên lệch tâm. -->
            <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle class="ring" cx="8" cy="8" r="7.25" />
                <circle class="glyph" cx="8" cy="4.75" r="1" />
                <line class="glyph" x1="8" y1="7.25" x2="8" y2="11.75" />
            </svg>
        </button>
        @if (open()) {
            <span
                #tip
                class="tip"
                role="tooltip"
                [id]="id"
                [style.transform]="'translateX(calc(-50% + ' + shift() + 'px))'"
                >{{ text() }}</span
            >
        }
    `,
    styleUrl: './info-tip.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(mouseenter)': 'show()',
        '(mouseleave)': 'hide()',
        '(keydown.escape)': 'hide()',
    },
})
export class InfoTip {
    /** Nội dung giải thích; xuống dòng bằng "\n". */
    readonly text = input.required<string>();
    /** Tên ô được giải thích, cho trình đọc màn hình. */
    readonly label = input('');

    protected readonly id = `info-tip-${nextId++}`;
    protected readonly open = signal(false);
    protected readonly shift = signal(0);

    private readonly injector = inject(Injector);
    private readonly tip = viewChild<ElementRef<HTMLElement>>('tip');

    protected show(): void {
        if (this.open()) return;
        this.shift.set(0);
        this.open.set(true);
        afterNextRender(() => this.keepOnScreen(), { injector: this.injector });
    }

    // Chạm trên điện thoại: chạm vào "i" để mở (focus), chạm chỗ khác để
    // đóng (blur). Không cho click đóng lại vì focus vừa mở ngay trước đó.
    protected hide(): void {
        this.open.set(false);
    }

    private keepOnScreen(): void {
        const el = this.tip()?.nativeElement;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const maxRight = document.documentElement.clientWidth - EDGE;
        let dx = 0;
        if (rect.right > maxRight) dx = maxRight - rect.right;
        if (rect.left + dx < EDGE) dx = EDGE - rect.left;
        this.shift.set(dx);
    }
}
