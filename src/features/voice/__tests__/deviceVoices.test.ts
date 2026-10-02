import { createDeviceTtsProvider } from '../DeviceTtsProvider';
import { classifyDeviceVoice, sortVoicesForPicker } from '../deviceVoices';

describe('classifyDeviceVoice', () => {
  it('reads Premium from the identifier when the native quality is Default', () => {
    expect(
      classifyDeviceVoice({
        identifier: 'com.apple.voice.premium.en-US.Ava',
        quality: 'Default',
      }),
    ).toBe('premium');
  });

  it('reads Enhanced from either the identifier or the quality flag', () => {
    expect(
      classifyDeviceVoice({
        identifier: 'com.apple.voice.enhanced.en-GB.Daniel',
        quality: 'Default',
      }),
    ).toBe('enhanced');
    expect(
      classifyDeviceVoice({
        identifier: 'com.apple.voice.compact.en-US.Samantha',
        quality: 'Enhanced',
      }),
    ).toBe('enhanced');
  });
});

describe('device voice list', () => {
  it('puts downloaded English voices ahead of the built-in compact ones', async () => {
    const speech = {
      getAvailableVoicesAsync: async () => [
        {
          identifier: 'com.apple.voice.compact.en-US.Samantha',
          name: 'Samantha',
          language: 'en-US',
          quality: 'Default',
        },
        {
          identifier: 'com.apple.voice.compact.bg-BG.Daria',
          name: 'Daria',
          language: 'bg-BG',
          quality: 'Default',
        },
        {
          identifier: 'com.apple.voice.premium.en-US.Ava',
          name: 'Ava',
          language: 'en-US',
          quality: 'Default',
        },
        {
          identifier: 'com.apple.voice.enhanced.en-GB.Daniel',
          name: 'Daniel',
          language: 'en-GB',
          quality: 'Enhanced',
        },
      ],
      speak: jest.fn(),
      stop: async () => undefined,
      isSpeakingAsync: async () => false,
    };
    const voices = await createDeviceTtsProvider(speech).listVoices();
    expect(voices.map((voice) => voice.name)).toEqual([
      'Ava',
      'Daniel',
      'Samantha',
      'Daria',
    ]);
    expect(voices[0]?.quality).toBe('premium');
  });

  it('sorts a picker list with English Premium first', () => {
    const sorted = sortVoicesForPicker([
      {
        id: 'compact',
        name: 'Samantha',
        language: 'en-US',
        offline: true,
        quality: 'default',
      },
      {
        id: 'premium',
        name: 'Ava',
        language: 'en-US',
        offline: true,
        quality: 'premium',
      },
    ]);
    expect(sorted[0]?.id).toBe('premium');
  });
});
