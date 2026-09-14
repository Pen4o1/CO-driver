import { z } from 'zod';

const latLngLoc = z
  .object({
    lat: z.number(),
    lon: z.number(),
  })
  .passthrough();

export const valhallaManeuverSchema = z
  .object({
    type: z.number(),
    instruction: z.string(),
    length: z.number(),
    time: z.number(),
    begin_shape_index: z.number().optional(),
    street_names: z.array(z.string()).optional(),
    verbal_succinct_transition_instruction: z.string().optional(),
  })
  .passthrough();

export const valhallaLegSchema = z
  .object({
    maneuvers: z.array(valhallaManeuverSchema),
    shape: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    summary: z
      .object({
        time: z.number(),
        length: z.number(),
        has_highway: z.boolean().optional(),
        has_toll: z.boolean().optional(),
        has_ferry: z.boolean().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const valhallaTripSchema = z
  .object({
    legs: z.array(valhallaLegSchema).min(1),
    summary: z
      .object({
        time: z.number(),
        length: z.number(),
        has_highway: z.boolean().optional(),
        units: z.string().optional(),
      })
      .passthrough(),
    units: z.string().optional(),
    locations: z.array(latLngLoc).optional(),
  })
  .passthrough();

export const valhallaDirectionsSchema = z
  .object({
    trip: valhallaTripSchema,
    alternates: z
      .array(z.object({ trip: valhallaTripSchema }).passthrough())
      .optional(),
  })
  .passthrough();

export type ValhallaDirections = z.infer<typeof valhallaDirectionsSchema>;
export type ValhallaTrip = z.infer<typeof valhallaTripSchema>;
export type ValhallaManeuver = z.infer<typeof valhallaManeuverSchema>;
