import { PHOTON_SEARCH_URL } from '@/core/config';
import { haversineM } from '@/core/geo/haversine';
import type { LatLng } from '@/core/types';

import type { PhotonHit } from './photonSchema';

/** Photon public API rejects every other language with HTTP 400. */
const PHOTON_LANGS = new Set(['de', 'en', 'fr']);

const RESULT_CAP = 6;

/**
 * Street-kind words Photon treats as part of the name, so "ул. Витоша 15"
 * misses the boulevard and "Витоша 15" finds it.
 */
const LEADING_PLACE_KIND =
  /^(?:(?:ул|бул|пл|кв|ul|bul|st|str|rd|ave|blvd)\.\s*|(?:ул|бул|пл|кв|ul|bul|st|str|rd|ave|blvd|улица|булевард|площад|квартал|ulitsa|bulevard|street|road|avenue|boulevard)\s+)/iu;

export type PhotonPlace = {
  name?: string;
  city?: string;
  country?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
};

export function photonLanguage(locale?: string): string | undefined {
  const source = locale ?? Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  const code = source.toLowerCase().split(/[-_]/)[0] ?? '';
  return PHOTON_LANGS.has(code) ? code : undefined;
}

export function normalizeAddressQuery(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const stripped = trimmed
    .replace(LEADING_PLACE_KIND, '')
    .trim()
    .replace(/\s+/g, ' ');
  return stripped.length >= 3 ? stripped : trimmed;
}

export function photonSearchUrl(
  query: string,
  options: { lang?: string; bias?: LatLng },
): string {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', '12');
  params.set('dedupe', '0');
  if (options.lang && PHOTON_LANGS.has(options.lang)) {
    params.set('lang', options.lang);
  }
  if (options.bias) {
    params.set('lat', options.bias.lat.toFixed(5));
    params.set('lon', options.bias.lng.toFixed(5));
    params.set('location_bias_scale', '0.5');
    params.set('zoom', '10');
  }
  return `${PHOTON_SEARCH_URL}?${params.toString()}`;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? '';
}

function uniqueParts(parts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const text = part.trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function placeKind(place: PhotonPlace): string {
  const value = place.osm_value ?? '';
  const key = place.osm_key ?? '';
  const type = place.type ?? '';
  if (value === 'bus_stop') return 'Stop';
  if (type === 'house' || place.housenumber) return 'Address';
  if (type === 'street' || key === 'highway') return 'Street';
  if (type === 'city' || value === 'city') return 'City';
  if (type === 'town' || value === 'town') return 'Town';
  if (type === 'village' || value === 'village') return 'Village';
  if (
    type === 'district' ||
    value === 'suburb' ||
    value === 'neighbourhood' ||
    value === 'quarter'
  ) {
    return 'Area';
  }
  if (type === 'state' || key === 'boundary') return 'Region';
  return 'Place';
}

function formatHit(place: PhotonPlace, lat: number, lng: number): PhotonHit {
  const number = clean(place.housenumber);
  const street = clean(place.street);
  const name = clean(place.name);
  const address = [number, street].filter((part) => part.length > 0).join(' ');
  const title = address || name || 'Unknown place';
  const city = clean(place.city);
  const country = clean(place.country);
  const poi =
    name.length > 0 &&
    name.toLocaleLowerCase() !== title.toLocaleLowerCase() &&
    name.toLocaleLowerCase() !== street.toLocaleLowerCase()
      ? name
      : '';
  const context = city
    ? [
        poi,
        clean(place.district),
        clean(place.locality),
        city,
        clean(place.postcode),
        country,
      ]
    : [
        poi,
        clean(place.district),
        clean(place.locality),
        clean(place.county),
        clean(place.state),
        clean(place.postcode),
        country,
      ];
  const subtitle = uniqueParts(context)
    .filter((part) => part.toLocaleLowerCase() !== title.toLocaleLowerCase())
    .join(' · ');
  const label = uniqueParts([title, city, country]).join(', ') || title;
  return { title, subtitle, label, kind: placeKind(place), lat, lng };
}

function scorePlace(place: PhotonPlace, query: string): number {
  const q = query.toLocaleLowerCase();
  const tokens = q.split(/\s+/).filter((token) => token.length > 0);
  const name = clean(place.name).toLocaleLowerCase();
  const street = clean(place.street).toLocaleLowerCase();
  const blob = [
    name,
    street,
    place.city,
    place.locality,
    place.district,
    place.county,
    place.state,
    place.country,
    place.housenumber,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .toLocaleLowerCase();
  let score = 0;
  const number = tokens.find((token) => /^\d+\p{L}?$/u.test(token));
  if (number && clean(place.housenumber).toLocaleLowerCase() === number) {
    score += 80;
  }
  if (name === q || street === q) score += 100;
  else if (
    (name.length > 0 && name.startsWith(q)) ||
    (street.length > 0 && street.startsWith(q))
  ) {
    score += 40;
  }
  if (tokens.length > 0 && tokens.every((token) => blob.includes(token))) {
    score += 30;
  }
  const placeType = place.type ?? place.osm_value ?? '';
  const named =
    name === q || name.startsWith(q) || street === q || street.startsWith(q);
  if (named && (placeType === 'city' || place.osm_value === 'city')) {
    score += 40;
  } else if (named && (placeType === 'town' || place.osm_value === 'town')) {
    score += 36;
  } else if (
    named &&
    (placeType === 'village' || place.osm_value === 'village')
  ) {
    score += 28;
  }
  if (
    place.osm_key === 'waterway' ||
    place.osm_value === 'river' ||
    place.osm_value === 'peak'
  ) {
    score -= 40;
  }
  if (place.osm_value === 'bus_stop') score -= 25;
  if (place.type === 'state' || place.osm_key === 'boundary') score -= 10;
  return score;
}

export function presentPhotonHits(
  rows: { place: PhotonPlace; lat: number; lng: number }[],
  query: string,
  bias?: LatLng,
): PhotonHit[] {
  const ranked = rows
    .map((row, index) => ({
      row,
      index,
      score: scorePlace(row.place, query),
      distance: bias ? haversineM(bias, { lat: row.lat, lng: row.lng }) : 0,
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.distance - b.distance || a.index - b.index,
    );
  const seen = new Set<string>();
  const hits: PhotonHit[] = [];
  for (const item of ranked) {
    const hit = formatHit(item.row.place, item.row.lat, item.row.lng);
    const key = [
      hit.title.toLocaleLowerCase(),
      hit.subtitle.toLocaleLowerCase(),
      item.row.lat.toFixed(3),
      item.row.lng.toFixed(3),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(hit);
    if (hits.length >= RESULT_CAP) break;
  }
  return hits;
}
