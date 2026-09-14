import { valhallaTraceBody } from './valhallaTrace';

describe('valhallaTraceBody', () => {
  it('uses map_snap auto costing for GPS traces', () => {
    const body = valhallaTraceBody([
      { lat: 42.7, lng: 23.32 },
      { lat: 42.69, lng: 23.31 },
    ]);
    expect(body.shape_match).toBe('map_snap');
    expect(body.costing).toBe('auto');
    expect(body.shape).toEqual([
      { lat: 42.7, lon: 23.32 },
      { lat: 42.69, lon: 23.31 },
    ]);
  });
});
