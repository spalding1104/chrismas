import { VndPipe } from './vnd.pipe';

describe('VndPipe', () => {
  const pipe = new VndPipe();
  const digits = (s: string) => s.replace(/[^\d]/g, '');

  it('formats VND without decimals', () => {
    expect(digits(pipe.transform(1_250_000))).toBe('1250000');
  });

  it('adds a sign only when asked', () => {
    expect(pipe.transform(5000, 'always').startsWith('+')).toBe(true);
    expect(pipe.transform(-5000).startsWith('-')).toBe(true);
    expect(pipe.transform(0, 'always').startsWith('+')).toBe(false);
  });
});
