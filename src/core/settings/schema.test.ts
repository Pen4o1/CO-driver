import {
  DEFAULT_PERSISTED_SETTINGS,
  filterFromPersisted,
  parsePersistedSettings,
} from './schema';

describe('persisted settings', () => {
  it('returns defaults on garbage', () => {
    expect(parsePersistedSettings({ nope: true })).toEqual(
      DEFAULT_PERSISTED_SETTINGS,
    );
  });

  it('round-trips a valid blob into a note filter', () => {
    const next = parsePersistedSettings({
      ...DEFAULT_PERSISTED_SETTINGS,
      minGradeToCall: 3,
      verbosity: 'terse',
    });
    expect(filterFromPersisted(next).minGradeToCall).toBe(3);
    expect(filterFromPersisted(next).verbosity).toBe('terse');
  });
});
