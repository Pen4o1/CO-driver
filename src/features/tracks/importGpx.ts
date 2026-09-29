import { File } from 'expo-file-system';

import { candidateFromTrack, parseGpx } from '@/core/tracks';
import { saveRoute } from '@/features/storage';

const MAX_BYTES = 8_000_000;

function fallbackName(filename: string): string {
  const stripped = filename.replace(/\.(gpx|xml)$/i, '').trim();
  return stripped.length > 0 ? stripped.slice(0, 80) : 'Uploaded track';
}

/** Pick a GPX file and save it as a route the co-driver can call. */
export async function importGpxTrack(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['*/*'] });
  if (picked.canceled || !picked.result) return null;
  const file = picked.result;
  if (file.size > MAX_BYTES) {
    throw new Error('That file is too large. Keep tracks under 8 MB.');
  }
  const xml = await file.text();
  const parsed = parseGpx(xml);
  if (!parsed.ok) throw new Error(parsed.message);
  const name = parsed.track.name?.slice(0, 80) || fallbackName(file.name);
  const built = candidateFromTrack(parsed.track, `gpx_${Date.now()}`);
  if (!built.ok) throw new Error(built.message);
  return saveRoute({
    name,
    candidate: built.candidate,
    note: 'Uploaded GPX',
  });
}
