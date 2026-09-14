export const fetchBinary: (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
) => Promise<{
  status: number;
  ok: boolean;
  bytes(): Promise<Uint8Array>;
  text(): Promise<string>;
}> = async (url, init) => {
  const response = await fetch(url, init);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const decoded = new TextDecoder().decode(bytes);
  return {
    status: response.status,
    ok: response.ok,
    bytes: async () => bytes,
    text: async () => decoded,
  };
};
