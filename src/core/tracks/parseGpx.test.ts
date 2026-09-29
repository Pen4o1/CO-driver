import { parseGpx } from './parseGpx';

const STAGE = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <metadata><name>File</name></metadata>
  <!-- <trkpt lat="0" lon="0"></trkpt> -->
  <trk>
    <name>Stage 1 &amp; 2</name>
    <trkseg>
      <trkpt lat="42.7000" lon="23.3000"><ele>500</ele><time>2024-06-01T10:00:00Z</time></trkpt>
      <trkpt lon="23.3000" lat="42.7020"><ele>520</ele><time>2024-06-01T10:02:00Z</time></trkpt>
      <trkpt lat="42.7020" lon="23.3040"><ele>510</ele><time>2024-06-01T10:04:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('parseGpx', () => {
  it('reads the track name, elevation, and timestamps', () => {
    const parsed = parseGpx(STAGE);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.track.name).toBe('Stage 1 & 2');
    expect(parsed.track.points).toHaveLength(3);
    expect(parsed.track.points[0]).toMatchObject({
      lat: 42.7,
      lng: 23.3,
      eleM: 500,
    });
    expect(parsed.track.points[1].lat).toBeCloseTo(42.702);
    expect(parsed.track.points[0].timeMs).toBe(
      Date.parse('2024-06-01T10:00:00Z'),
    );
  });

  it('accepts a self-closing route point when there is no track', () => {
    const parsed = parseGpx(`<gpx>
      <rte>
        <name>Link</name>
        <rtept lat="42.70" lon="23.30"/>
        <rtept lat="42.71" lon="23.31"/>
      </rte>
    </gpx>`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.track.name).toBe('Link');
    expect(parsed.track.points).toHaveLength(2);
    expect(parsed.track.points[0].eleM).toBeNull();
  });

  it('rejects a file with no line', () => {
    expect(parseGpx('<gpx></gpx>')).toEqual({
      ok: false,
      message: 'The track needs at least two points.',
    });
    expect(parseGpx('<not-gpx></not-gpx>').ok).toBe(false);
  });
});
