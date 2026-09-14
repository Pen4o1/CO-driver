import { z } from 'zod';

/** ORS returns [lng,lat] or [lng,lat,z] when elevation:true. */
export const orsCoordSchema = z.union([
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number()]),
]);

export const orsIndexTripleSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
]);

export const orsExtraBlockSchema = z.object({
  values: z.array(orsIndexTripleSchema),
  summary: z
    .array(
      z.object({
        value: z.number(),
        distance: z.number(),
        amount: z.number(),
      }),
    )
    .optional(),
});

export const orsStepSchema = z
  .object({
    distance: z.number(),
    duration: z.number(),
    type: z.number().optional(),
    instruction: z.string(),
    name: z.string().optional(),
    way_points: z.tuple([z.number(), z.number()]).optional(),
    exit_number: z.number().optional(),
  })
  .passthrough();

export const orsSegmentSchema = z.object({
  distance: z.number(),
  duration: z.number(),
  steps: z.array(orsStepSchema),
});

export const orsSummarySchema = z.object({
  distance: z.number(),
  duration: z.number(),
});

export const orsFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    properties: z
      .object({
        segments: z.array(orsSegmentSchema),
        summary: orsSummarySchema,
        extras: z.record(z.string(), orsExtraBlockSchema).optional(),
        way_points: z.array(z.number()).optional(),
      })
      .passthrough(),
    geometry: z.object({
      type: z.literal('LineString'),
      coordinates: z.array(orsCoordSchema).min(2),
    }),
  })
  .passthrough();

export const orsDirectionsSchema = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z.array(orsFeatureSchema).min(1),
  })
  .passthrough();

export type OrsDirections = z.infer<typeof orsDirectionsSchema>;
export type OrsFeature = z.infer<typeof orsFeatureSchema>;
export type OrsCoord = z.infer<typeof orsCoordSchema>;
export type OrsExtraBlock = z.infer<typeof orsExtraBlockSchema>;
