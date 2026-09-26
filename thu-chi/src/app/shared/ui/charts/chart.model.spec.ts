import { niceTicks } from './chart.model';

describe('niceTicks', () => {
  it('rounds the axis up to a nice step', () => {
    expect(niceTicks(4_650_000)).toEqual([0, 2_000_000, 4_000_000, 6_000_000]);
    expect(niceTicks(890_000)).toEqual([0, 250_000, 500_000, 750_000, 1_000_000]);
  });

  it('handles an empty series', () => {
    expect(niceTicks(0)).toEqual([0]);
  });
});
