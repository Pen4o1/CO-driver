import { destinationPoint } from '@/core/geo';
import { derivePaceNotes } from '@/core/pacenotes';

import { candidateFromTrack } from './candidateFromTrack';
import { parseGpx } from './parseGpx';

function pointXml(lat: number, lng: number): string {
  return `<trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"/>`;
}

describe('candidateFromTrack', () => {
  it('builds a driveable line and pace notes from a GPX corner', () => {
    const start = { lat: 42.7, lng: 23.3 };
    const mid = destinationPoint(start, 0, 250);
    const end = destinationPoint(mid, 90, 250);
    const xml = `<gpx><trk><name>Corner</name><trkseg>
      ${pointXml(start.lat, start.lng)}
      ${pointXml(mid.lat, mid.lng)}
      ${pointXml(end.lat, end.lng)}
    </trkseg></trk></gpx>`;
    const parsed = parseGpx(xml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const built = candidateFromTrack(parsed.track, 'gpx_test');
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.candidate.providerId).toBe('gpx');
    expect(built.candidate.geometry.lengthM).toBeGreaterThan(400);
    expect(built.candidate.breakdown.tags).toContain('uploaded');
    const notes = derivePaceNotes(built.candidate.geometry, []);
    expect(notes.some((note) => note.type === 'corner')).toBe(true);
  });

  it('thins a point every metre down to the call spacing', () => {
    let cursor = { lat: 42.7, lng: 23.3 };
    const parts = [pointXml(cursor.lat, cursor.lng)];
    for (let i = 0; i < 80; i += 1) {
      cursor = destinationPoint(cursor, 90, 1);
      parts.push(pointXml(cursor.lat, cursor.lng));
    }
    const parsed = parseGpx(
      `<gpx><trk><trkseg>${parts.join('')}</trkseg></trk></gpx>`,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const built = candidateFromTrack(parsed.track, 'gpx_dense');
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.candidate.geometry.coords.length).toBeLessThan(20);
    expect(built.candidate.geometry.lengthM).toBeGreaterThan(70);
  });

  it('rejects a two-point hop that is only a few metres', () => {
    const parsed = parseGpx(`<gpx><trk><trkseg>
      <trkpt lat="42.70000" lon="23.30000"/>
      <trkpt lat="42.70001" lon="23.30000"/>
    </trkseg></trk></gpx>`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(candidateFromTrack(parsed.track, 'gpx_short')).toEqual({
      ok: false,
      message: 'That track is too short to call notes on.',
    });
  });
});
