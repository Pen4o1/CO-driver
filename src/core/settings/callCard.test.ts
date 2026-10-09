import { DEFAULT_PERSISTED_SETTINGS, type PersistedSettings } from './schema';
import {
  callCardSummary,
  parseRouteVoiceCard,
  patchActiveCallCard,
  selectVoicePreset,
  voiceCardFromSettings,
  voiceForRoute,
} from './callCard';

describe('route call card', () => {
  it('starts both presets from Settings', () => {
    const card = voiceCardFromSettings({
      ...DEFAULT_PERSISTED_SETTINGS,
      leadPreset: 'late',
      minGradeToCall: 3,
      verbosity: 'terse',
      confirmCalls: false,
    });
    expect(card.active).toBe('bike');
    expect(card.bike).toEqual(card.car);
    expect(card.bike.minGradeToCall).toBe(3);
    expect(card.bike.leadPreset).toBe('late');
  });

  it('overlays grade, verbosity, and confirm, and leaves the chain distance', () => {
    const settings: PersistedSettings = {
      ...DEFAULT_PERSISTED_SETTINGS,
      chainRadius: 80,
      includeJunctions: false,
      minGradeToCall: 6,
      verbosity: 'full',
      confirmCalls: true,
    };
    const stored = patchActiveCallCard(voiceCardFromSettings(settings), {
      minGradeToCall: 2,
      verbosity: 'terse',
      confirmCalls: false,
    });
    const voice = voiceForRoute(stored, settings);
    expect(voice.saved).toBe(true);
    expect(voice.filter.minGradeToCall).toBe(2);
    expect(voice.filter.verbosity).toBe('terse');
    expect(voice.filter.confirmCalls).toBe(false);
    expect(voice.filter.chainRadius).toBe(80);
    expect(voice.filter.includeJunctions).toBe(false);
    expect(voice.leadPreset).toBe(settings.leadPreset);
  });

  it('keeps using Settings until a card is stored', () => {
    const voice = voiceForRoute(null, {
      ...DEFAULT_PERSISTED_SETTINGS,
      minGradeToCall: 4,
    });
    expect(voice.saved).toBe(false);
    expect(voice.filter.minGradeToCall).toBe(4);
  });

  it('edits only the active preset', () => {
    const base = voiceCardFromSettings(DEFAULT_PERSISTED_SETTINGS);
    const car = selectVoicePreset(base, 'car');
    const patched = patchActiveCallCard(car, { minGradeToCall: 1 });
    expect(patched.car.minGradeToCall).toBe(1);
    expect(patched.bike.minGradeToCall).toBe(base.bike.minGradeToCall);
    expect(callCardSummary(patched)).toContain('Car');
    expect(callCardSummary(patched)).toContain('≤1');
  });

  it('rejects a card with a grade outside 1..6', () => {
    expect(
      parseRouteVoiceCard({
        active: 'bike',
        bike: {
          leadPreset: 'early',
          minGradeToCall: 9,
          verbosity: 'full',
          confirmCalls: true,
        },
        car: {
          leadPreset: 'early',
          minGradeToCall: 4,
          verbosity: 'full',
          confirmCalls: true,
        },
      }),
    ).toBeNull();
  });
});
