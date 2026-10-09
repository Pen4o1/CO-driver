import { z } from 'zod';

import type { LeadTimePreset, NoteFilterOptions } from '@/core/types';

import {
  filterFromPersisted,
  leadPresetSchema,
  turnGradeSchema,
  verbositySchema,
  type PersistedSettings,
} from './schema';

export const callCardSchema = z.object({
  leadPreset: leadPresetSchema,
  minGradeToCall: turnGradeSchema,
  verbosity: verbositySchema,
  confirmCalls: z.boolean(),
});

export type CallCard = z.infer<typeof callCardSchema>;

export const routeVoiceCardSchema = z.object({
  active: z.enum(['bike', 'car']),
  bike: callCardSchema,
  car: callCardSchema,
});

export type RouteVoiceCard = z.infer<typeof routeVoiceCardSchema>;

/** Both slots start as the current Settings card. They diverge when edited. */
export function voiceCardFromSettings(
  settings: PersistedSettings,
): RouteVoiceCard {
  const card: CallCard = {
    leadPreset: settings.leadPreset,
    minGradeToCall: settings.minGradeToCall,
    verbosity: settings.verbosity,
    confirmCalls: settings.confirmCalls,
  };
  return { active: 'bike', bike: { ...card }, car: { ...card } };
}

export function parseRouteVoiceCard(raw: unknown): RouteVoiceCard | null {
  const parsed = routeVoiceCardSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function activeCallCard(card: RouteVoiceCard): CallCard {
  return card[card.active];
}

/** Route card overrides lead-adjacent call fields. The rest stay global. */
export function applyCallCard(
  filter: NoteFilterOptions,
  card: CallCard,
): NoteFilterOptions {
  return {
    ...filter,
    minGradeToCall: card.minGradeToCall,
    verbosity: card.verbosity,
    confirmCalls: card.confirmCalls,
  };
}

export function voiceForRoute(
  stored: RouteVoiceCard | null,
  settings: PersistedSettings,
): {
  card: RouteVoiceCard;
  saved: boolean;
  filter: NoteFilterOptions;
  leadPreset: LeadTimePreset;
} {
  const card = stored ?? voiceCardFromSettings(settings);
  const active = activeCallCard(card);
  return {
    card,
    saved: stored !== null,
    filter: applyCallCard(filterFromPersisted(settings), active),
    leadPreset: active.leadPreset,
  };
}

export function selectVoicePreset(
  card: RouteVoiceCard,
  active: RouteVoiceCard['active'],
): RouteVoiceCard {
  return { ...card, active };
}

export function patchActiveCallCard(
  card: RouteVoiceCard,
  patch: Partial<CallCard>,
): RouteVoiceCard {
  const active = card.active;
  return { ...card, [active]: { ...card[active], ...patch } };
}

export function callCardSummary(card: RouteVoiceCard): string {
  const active = activeCallCard(card);
  const name = card.active === 'bike' ? 'Bike' : 'Car';
  const lead = titleCase(active.leadPreset);
  const verbosity = titleCase(active.verbosity);
  const confirm = active.confirmCalls ? 'confirm' : 'no confirm';
  return `${name} · ${lead} · ≤${active.minGradeToCall} · ${verbosity} · ${confirm}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
