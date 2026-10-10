import {
  normalizeAddressQuery,
  photonLanguage,
  photonSearchUrl,
  presentPhotonHits,
} from './photonHits';

const sofia = { lat: 42.6977, lng: 23.3219 };

describe('normalizeAddressQuery', () => {
  it('strips street prefixes that hide the real address', () => {
    expect(normalizeAddressQuery('ул. Витоша 15')).toBe('Витоша 15');
    expect(normalizeAddressQuery('бул. България 100')).toBe('България 100');
    expect(normalizeAddressQuery('ul. Vitosha 15')).toBe('Vitosha 15');
    expect(normalizeAddressQuery('bul. Bulgaria 100')).toBe('Bulgaria 100');
  });

  it('leaves place names and words that only start like a prefix', () => {
    expect(normalizeAddressQuery('Sofia')).toBe('Sofia');
    expect(normalizeAddressQuery('Bulgaria')).toBe('Bulgaria');
    expect(normalizeAddressQuery('Ултра София')).toBe('Ултра София');
  });
});

describe('photonLanguage', () => {
  it('sends only languages the public Photon server accepts', () => {
    expect(photonLanguage('en-US')).toBe('en');
    expect(photonLanguage('de_DE')).toBe('de');
    expect(photonLanguage('fr')).toBe('fr');
    expect(photonLanguage('bg-BG')).toBeUndefined();
  });
});

describe('photonSearchUrl', () => {
  it('biases nearby and keeps house numbers', () => {
    const params = new URL(
      photonSearchUrl('Витоша 15', { bias: sofia, lang: 'bg' }),
    ).searchParams;
    expect(params.get('q')).toBe('Витоша 15');
    expect(params.get('dedupe')).toBe('0');
    expect(params.get('lat')).toBe('42.69770');
    expect(params.get('lon')).toBe('23.32190');
    expect(params.get('location_bias_scale')).toBe('0.5');
    expect(params.get('lang')).toBeNull();
  });
});

describe('presentPhotonHits', () => {
  it('picks the city over a same-named region', () => {
    const hits = presentPhotonHits(
      [
        {
          place: {
            name: 'Sofia',
            country: 'Madagascar',
            osm_key: 'boundary',
            osm_value: 'administrative',
            type: 'state',
          },
          lat: -15.28,
          lng: 48.22,
        },
        {
          place: {
            name: 'Sofia',
            city: 'Sofia',
            country: 'Bulgaria',
            osm_key: 'place',
            osm_value: 'city',
            type: 'city',
          },
          lat: 42.698,
          lng: 23.322,
        },
      ],
      'Sofia',
      sofia,
    );
    expect(hits[0]?.kind).toBe('City');
    expect(hits[0]?.label).toBe('Sofia, Bulgaria');
    expect(hits[0]?.subtitle).toBe('Bulgaria');
  });

  it('prefers the nearer house when the street number matches', () => {
    const hits = presentPhotonHits(
      [
        {
          place: {
            housenumber: '15',
            street: 'Витоша',
            country: 'България',
            type: 'house',
            osm_key: 'building',
            osm_value: 'yes',
          },
          lat: 42.626,
          lng: 23.404,
        },
        {
          place: {
            housenumber: '15',
            street: 'бул. Витоша',
            city: 'София',
            district: 'Център',
            country: 'България',
            postcode: '1000',
            type: 'house',
            osm_key: 'building',
            osm_value: 'apartments',
          },
          lat: 42.694,
          lng: 23.321,
        },
        {
          place: {
            name: 'ул. Витоша',
            street: 'Околовръстна',
            city: 'Панчарево',
            osm_key: 'highway',
            osm_value: 'bus_stop',
            type: 'house',
          },
          lat: 42.655,
          lng: 23.46,
        },
      ],
      'Витоша 15',
      sofia,
    );
    expect(hits[0]?.title).toBe('15 бул. Витоша');
    expect(hits[0]?.kind).toBe('Address');
    expect(hits[0]?.label).toBe('15 бул. Витоша, София, България');
    expect(hits[0]?.subtitle).toContain('София');
    expect(hits.some((hit) => hit.kind === 'Stop')).toBe(true);
    expect(hits.findIndex((hit) => hit.kind === 'Stop')).toBeGreaterThan(0);
  });
});
