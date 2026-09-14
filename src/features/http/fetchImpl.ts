import type { HttpGet } from '../routing/httpErrors';

export const fetchImpl: HttpGet = async (url, init) => {
  const response = await fetch(url, init);
  return {
    status: response.status,
    ok: response.ok,
    headers: { get: (name) => response.headers.get(name) },
    json: () => response.json(),
    text: () => response.text(),
  };
};
