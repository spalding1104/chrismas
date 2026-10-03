// Kiểm tra style chỉ dùng design token (src/styles/_tokens.scss).
// Báo lỗi khi viết cứng màu, hoặc viết cứng số cho các thuộc tính đã có
// token (khoảng cách, bo góc, cỡ chữ, hiệu ứng, bóng đổ, z-index), hoặc
// dùng @media với px thay cho mixin from()/below(), hoặc dùng var(--x) mà
// --x không được khai báo ở đâu cả.
// Được phép: khai báo biến CSS riêng của component (`--ten: 14px;`), 0 và 1px.
import { readFileSync, globSync } from 'node:fs';

const TOKENS_FILE = 'src/styles/_tokens.scss';
const TOKENIZED = new RegExp(
    '^(gap|row-gap|column-gap|padding(-[a-z]+)*|margin(-[a-z]+)*|' +
        'border-radius|font-size|transition(-[a-z]+)*|animation(-[a-z]+)*|' +
        'box-shadow|z-index|outline-offset)$',
);
const COLOR = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|oklab)\(/i;
const HARD_NUMBER = /(?<![\w-])(\d*\.?\d+)(px|rem|em|ms|s)\b/g;

const files = globSync(['src/**/*.scss', 'src/app/**/*.ts']).filter(
    (f) => f.replaceAll('\\', '/') !== TOKENS_FILE && !f.endsWith('.spec.ts'),
);

// Mọi biến CSS được khai báo ở đâu đó: `--ten:` trong scss/ts, hoặc gán từ
// template qua `[style.--ten]`. Dùng var(--ten) không có trong tập này là
// gõ sai/token không tồn tại — trình duyệt lặng lẽ bỏ cả dòng khai báo.
const defined = new Set();
for (const file of globSync([
    'src/**/*.scss',
    'src/**/*.ts',
    'src/**/*.html',
])) {
    const raw = readFileSync(file, 'utf8');
    for (const m of raw.matchAll(/(?:^|[\s{;'"])(--[\w-]+)\s*:/g)) {
        defined.add(m[1]);
    }
    for (const m of raw.matchAll(/style\.(--[\w-]+)/g)) defined.add(m[1]);
}

const problems = [];
for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    // Bỏ comment nhưng giữ nguyên số dòng.
    const text = raw
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/.*$/gm, (m, p) => p + ' '.repeat(m.length - 1));
    const lineOf = (index) => text.slice(0, index).split('\n').length;
    const report = (index, message) =>
        problems.push(`${file}:${lineOf(index)}  ${message}`);

    for (const m of text.matchAll(/var\((--[\w-]+)/g)) {
        if (!defined.has(m[1])) {
            report(m.index, `var(${m[1]})  → token không tồn tại`);
        }
    }

    for (const m of text.matchAll(/@media[^{]*\d+px[^{]*\{/g)) {
        report(m.index, `${m[0].trim()}  → dùng @include from()/below()`);
    }

    for (const m of text.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
        const [, prop, value] = m;
        if (prop.startsWith('--')) continue;
        const clean = value.replace(/var\(--[\w-]+\)/g, 'VAR');
        if (COLOR.test(clean)) {
            report(m.index, `${prop}: ${value.trim()}  → dùng token màu`);
            continue;
        }
        if (!TOKENIZED.test(prop)) continue;
        const hard = [...clean.matchAll(HARD_NUMBER)].filter(
            ([all, n, unit]) => !(Number(n) === 0 || all === '1px'),
        );
        const bareZ = prop === 'z-index' && /\b\d+\b/.test(clean);
        if (hard.length || bareZ) {
            report(m.index, `${prop}: ${value.trim()}  → dùng token`);
        }
    }
}

if (problems.length) {
    console.error(`Có ${problems.length} lỗi token (xem ${TOKENS_FILE}):\n`);
    console.error(problems.map((p) => '  ' + p).join('\n'));
    process.exit(1);
}
console.log(`OK: ${files.length} file chỉ dùng design token.`);
