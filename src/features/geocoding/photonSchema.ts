import { z } from 'zod';

export const photonFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: z
    .object({
      name: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      street: z.string().optional(),
      housenumber: z.string().optional(),
      district: z.string().optional(),
      locality: z.string().optional(),
      county: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      osm_key: z.string().optional(),
      osm_value: z.string().optional(),
      type: z.string().optional(),
    })
    .passthrough(),
});

export const photonResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(photonFeatureSchema),
});

export type PhotonHit = {
  /** Single line stored on the pin. */
  label: string;
  title: string;
  subtitle: string;
  kind: string;
  lat: number;
  lng: number;
};
