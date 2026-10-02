export type VoiceQuality = 'default' | 'enhanced' | 'premium';

export type Voice = {
  id: string;
  name: string;
  language: string;
  offline: boolean;
  /** Device TTS only. Premium and Enhanced are the voices downloaded in iOS Settings. */
  quality?: VoiceQuality;
};

export type LocalFile = {
  uri: string;
  bytes: number;
  live: boolean;
};

export type SynthesizeOpts = {
  spellOutDistances?: boolean;
};

export type TtsProvider = {
  id: string;
  name: string;
  description: string;
  requiresNetwork: boolean;
  canPrerender: boolean;
  listVoices(): Promise<Voice[]>;
  synthesize(
    text: string,
    voiceId: string,
    opts?: SynthesizeOpts,
  ): Promise<LocalFile>;
  isAvailable(): Promise<boolean>;
};
