import { createCloudTtsProvider } from '../CloudTtsProvider';
import { createMemoryFileStore } from '../fileStore';
import type { FetchBinary } from '../CloudTtsProvider';

const mp3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

function binaryOk(): FetchBinary {
  return jest.fn(async () => ({
    status: 200,
    ok: true,
    bytes: async () => mp3,
    text: async () => '',
  }));
}

describe('createCloudTtsProvider', () => {
  it('POSTs OpenAI-compatible speech and writes a clip', async () => {
    const fetchImpl = binaryOk();
    const files = createMemoryFileStore();
    const provider = createCloudTtsProvider({
      baseUrl: 'http://127.0.0.1:5000/v1',
      model: 'tts-1',
      voiceId: 'lessac',
      fetchBinary: fetchImpl,
      files,
      hash: async (value) => `h_${value.length}`,
    });
    expect(await provider.isAvailable()).toBe(true);
    const file = await provider.synthesize('In 150, left four.', 'lessac');
    expect(file.live).toBe(false);
    expect(file.bytes).toBe(mp3.byteLength);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:5000/v1/audio/speech',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(
      (fetchImpl as jest.Mock).mock.calls[0][1].body as string,
    ) as { input: string; voice: string };
    expect(body.input).toBe('In 150, left four.');
    expect(body.voice).toBe('lessac');
  });

  it('is unavailable without a base URL', async () => {
    const provider = createCloudTtsProvider({
      baseUrl: '',
      model: 'tts-1',
      voiceId: 'x',
      fetchBinary: binaryOk(),
      files: createMemoryFileStore(),
      hash: async () => 'x',
    });
    expect(await provider.isAvailable()).toBe(false);
  });
});
