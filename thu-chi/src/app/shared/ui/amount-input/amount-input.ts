import { Directive, ElementRef, inject, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Số chữ số thập phân tối đa (đủ cho gõ tắt kiểu "1,5" + "000"). */
const MAX_DECIMALS = 3;

/**
 * Ô nhập số tiền hiển thị theo kiểu Việt Nam ngay khi gõ: "50000" → "50.000",
 * dấu phẩy là phần thập phân. Giá trị form vẫn là `number | null`.
 *
 * `<input appAmountInput formControlName="amount" />`. Đây là input
 * `type="text"` (type="number" không cho chèn dấu chấm phân cách), nên
 * directive tự lọc ký tự và giữ vị trí con trỏ khi định dạng lại.
 */
@Directive({
    selector: 'input[appAmountInput]',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: AmountInput,
            multi: true,
        },
    ],
    host: {
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        '(input)': 'onInput($event)',
        '(blur)': 'onTouched()',
    },
})
export class AmountInput implements ControlValueAccessor {
    /**
     * Số chữ số tối đa của phần nguyên (không tính dấu chấm phân cách).
     * Gõ thêm khi đã đủ thì ký tự đó bị bỏ, ô giữ nguyên như trước.
     */
    readonly maxIntegerDigits = input<number | null>(null);

    private readonly el =
        inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
    private onChange: (value: number | null) => void = () => {};
    protected onTouched: () => void = () => {};
    /** Nội dung hợp lệ gần nhất, để trả lại khi gõ vượt giới hạn. */
    private lastDisplay = '';

    writeValue(value: number | null): void {
        this.el.value = this.lastDisplay =
            value == null
                ? ''
                : group(normalize(String(value).replace('.', ',')));
    }

    registerOnChange(fn: (value: number | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(disabled: boolean): void {
        this.el.disabled = disabled;
    }

    protected onInput(event: Event): void {
        let raw = this.el.value;
        let caret = this.el.selectionStart ?? raw.length;
        // Bàn phím điện thoại theo locale tiếng Anh gõ "." làm dấu thập phân;
        // ở đây "." là phân cách hàng nghìn nên đổi ký tự vừa gõ thành ",".
        if ((event as InputEvent).data === '.' && raw[caret - 1] === '.') {
            raw = raw.slice(0, caret - 1) + ',' + raw.slice(caret);
        }

        const text = normalize(raw);
        const max = this.maxIntegerDigits();
        if (max != null && text.split(',')[0]!.length > max) {
            // Vượt giới hạn: bỏ ký tự vừa gõ/dán, con trỏ lùi về chỗ cũ.
            const back = raw.length - this.lastDisplay.length;
            this.el.value = this.lastDisplay;
            const pos = Math.max(0, caret - back);
            this.el.setSelectionRange(pos, pos);
            return;
        }
        const display = group(text);
        // Giữ con trỏ sau đúng số ký tự có nghĩa (chữ số, dấu phẩy) như trước.
        const keep = normalize(raw.slice(0, caret)).length;
        caret = 0;
        for (let seen = 0; caret < display.length && seen < keep; caret++) {
            if (display[caret] !== '.') seen++;
        }

        this.el.value = this.lastDisplay = display;
        this.el.setSelectionRange(caret, caret);
        this.onChange(parse(text));
    }
}

/** Chỉ giữ chữ số và một dấu phẩy: "05.0a0,5,1" → "5000,51". */
function normalize(raw: string): string {
    const [int = '', ...rest] = raw.replace(/[^\d,]/g, '').split(',');
    const intPart = int.replace(/^0+(?=\d)/, '');
    if (!rest.length) return intPart;
    const decimals = rest.join('').slice(0, MAX_DECIMALS);
    return `${intPart || '0'},${decimals}`;
}

/** "5000,5" → "5.000,5" (giữ nguyên phần sau dấu phẩy, kể cả khi đang gõ dở). */
function group(text: string): string {
    const [int, decimals] = text.split(',');
    const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimals === undefined ? grouped : `${grouped},${decimals}`;
}

function parse(text: string): number | null {
    if (!text) return null;
    return Number(text.replace(',', '.'));
}
