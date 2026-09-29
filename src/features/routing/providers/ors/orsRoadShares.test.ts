import { roadSharesFromOrsExtras } from './orsRoadShares';

describe('roadSharesFromOrsExtras', () => {
  it('counts city streets apart from country roads', () => {
    const cumulative = Float64Array.from([0, 100, 200, 300]);
    const shares = roadSharesFromOrsExtras(
      {
        waytype: {
          values: [
            [0, 1, 3],
            [1, 3, 2],
          ],
        },
      },
      cumulative,
      300,
    );
    expect(shares.streetShare).toBeCloseTo(100 / 300);
    expect(shares.lowSpeedRoadShare).toBeCloseTo(200 / 300);
  });
});
