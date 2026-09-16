export type OfflinePackMeta = {
  routeId: string;
  kind: 'map';
};

export function packMetadata(routeId: string): OfflinePackMeta {
  return { routeId, kind: 'map' };
}

export function isRoutePack(
  metadata: Record<string, unknown>,
  routeId: string,
): boolean {
  return metadata.routeId === routeId && metadata.kind === 'map';
}
