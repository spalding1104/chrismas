const quantity = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    maximumFractionDigits: 1,
});
const times = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export function formatQuantity(value: number, unit: string): string {
    return `${quantity.format(value)} ${unit}`;
}

/** 0.375 → "37,5%". */
export function formatRatio(ratio: number): string {
    return percent.format(ratio);
}

/** Độ lớn đòn bẩy: 2.666 → "2,67 lần". */
export function formatTimes(value: number): string {
    return `${times.format(value)} lần`;
}

/** Thay đổi có dấu: +12,5% / −3%. */
export function formatSignedPercent(value: number): string {
    const text = times.format(Math.abs(value));
    if (value > 0) return `+${text}%`;
    if (value < 0) return `−${text}%`;
    return '0%';
}
