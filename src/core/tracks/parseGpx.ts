export type TrackPoint = {
  lat: number;
  lng: number;
  eleM: number | null;
  timeMs: number | null;
};

export type ParsedTrack = {
  name: string | null;
  points: TrackPoint[];
};

export type TrackParseResult =
  { ok: true; track: ParsedTrack } | { ok: false; message: string };

const POINT =
  /<(?:[\w.-]+:)?(trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?\1>)/gi;

function decodeXml(text: string): string {
  const unwrapped = text.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  return unwrapped
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, digits: string) =>
      String.fromCodePoint(Number(digits)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(raw: string, name: string): string | null {
  const match = raw.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'),
  );
  if (!match) return null;
  return match[1] ?? match[2] ?? null;
}

function innerTag(block: string, tag: string): string | null {
  const match = block.match(
    new RegExp(
      `<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tag}>`,
      'i',
    ),
  );
  if (!match) return null;
  const text = decodeXml(match[1]);
  return text.length > 0 ? text : null;
}

function finiteOrNull(text: string | null): number | null {
  if (text === null) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function timeMs(text: string | null): number | null {
  if (text === null) return null;
  const value = Date.parse(text);
  return Number.isFinite(value) ? value : null;
}

function trackName(xml: string): string | null {
  const cut = xml.search(/<(?:[\w.-]+:)?(?:trkpt|rtept)\b/i);
  const head = cut === -1 ? xml : xml.slice(0, cut);
  const names = [
    ...head.matchAll(
      /<(?:[\w.-]+:)?name\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?name>/gi,
    ),
  ];
  if (names.length === 0) return null;
  const text = decodeXml(names[names.length - 1][1] ?? '');
  return text.length > 0 ? text : null;
}

function collect(xml: string, kind: 'trkpt' | 'rtept'): TrackPoint[] {
  const points: TrackPoint[] = [];
  for (const match of xml.matchAll(POINT)) {
    if (match[1]?.toLowerCase() !== kind) continue;
    const lat = finiteOrNull(attr(match[2] ?? '', 'lat'));
    const lng = finiteOrNull(attr(match[2] ?? '', 'lon'));
    if (
      lat === null ||
      lng === null ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      continue;
    }
    const body = match[3] ?? '';
    points.push({
      lat,
      lng,
      eleM: finiteOrNull(innerTag(body, 'ele')),
      timeMs: timeMs(innerTag(body, 'time')),
    });
    if (points.length >= 100_000) break;
  }
  return points;
}

/** GPX 1.1 track, falling back to a route (`rtept`) when there is no track. */
export function parseGpx(xml: string): TrackParseResult {
  const source = xml.replace(/^\uFEFF/, '').replace(/<!--[\s\S]*?-->/g, '');
  if (!/<(?:[\w.-]+:)?gpx\b/i.test(source)) {
    return { ok: false, message: 'That file is not a GPX track.' };
  }
  const points = collect(source, 'trkpt');
  const used = points.length >= 2 ? points : collect(source, 'rtept');
  if (used.length < 2) {
    return {
      ok: false,
      message: 'The track needs at least two points.',
    };
  }
  return { ok: true, track: { name: trackName(source), points: used } };
}
