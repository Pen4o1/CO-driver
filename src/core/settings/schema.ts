import { z } from 'zod';

import { DEFAULT_NOTE_FILTER } from '@/core/pacenotes';
import type { NoteFilterOptions } from '@/core/types';

export const unitSystemSchema = z.enum(['metric', 'imperial']);
export const leadPresetSchema = z.enum(['early', 'normal', 'late']);
export const verbositySchema = z.enum(['full', 'standard', 'terse']);
export const turnGradeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
export const routeStyleSchema = z.enum([
  'twist',
  'balanced',
  'cruise',
  'gentle',
  'custom',
]);
export const ttsProviderSchema = z.enum(['device', 'http']);

export const persistedSettingsSchema = z.object({
  providerId: z.enum(['ors', 'valhalla', 'osrm', 'mock']),
  ttsProviderId: ttsProviderSchema,
  voiceId: z.string(),
  voiceVolume: z.number(),
  spellOutDistances: z.boolean(),
  leadPreset: leadPresetSchema,
  confirmCalls: z.boolean(),
  chainRadius: z.number(),
  minGradeToCall: turnGradeSchema,
  includeJunctions: z.boolean(),
  includeCrests: z.boolean(),
  includeStraights: z.boolean(),
  includeCareNotes: z.boolean(),
  includeFinish: z.boolean(),
  verbosity: verbositySchema,
  defaultProfileId: routeStyleSchema,
  unitSystem: unitSystemSchema,
  keepScreenOn: z.boolean(),
});

export type PersistedSettings = z.infer<typeof persistedSettingsSchema>;

export const DEFAULT_PERSISTED_SETTINGS: PersistedSettings = {
  providerId: 'ors',
  ttsProviderId: 'device',
  voiceId: '',
  voiceVolume: 1,
  spellOutDistances: false,
  leadPreset: 'normal',
  confirmCalls: DEFAULT_NOTE_FILTER.confirmCalls,
  chainRadius: DEFAULT_NOTE_FILTER.chainRadius,
  minGradeToCall: DEFAULT_NOTE_FILTER.minGradeToCall,
  includeJunctions: DEFAULT_NOTE_FILTER.includeJunctions,
  includeCrests: DEFAULT_NOTE_FILTER.includeCrests,
  includeStraights: DEFAULT_NOTE_FILTER.includeStraights,
  includeCareNotes: DEFAULT_NOTE_FILTER.includeCareNotes,
  includeFinish: DEFAULT_NOTE_FILTER.includeFinish,
  verbosity: DEFAULT_NOTE_FILTER.verbosity,
  defaultProfileId: 'twist',
  unitSystem: 'metric',
  keepScreenOn: true,
};

export function filterFromPersisted(s: PersistedSettings): NoteFilterOptions {
  return {
    minGradeToCall: s.minGradeToCall,
    includeJunctions: s.includeJunctions,
    includeCrests: s.includeCrests,
    includeStraights: s.includeStraights,
    includeCareNotes: s.includeCareNotes,
    includeFinish: s.includeFinish,
    verbosity: s.verbosity,
    chainRadius: s.chainRadius,
    confirmCalls: s.confirmCalls,
  };
}

export function parsePersistedSettings(raw: unknown): PersistedSettings {
  const parsed = persistedSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_PERSISTED_SETTINGS;
  }
  return parsed.data;
}
