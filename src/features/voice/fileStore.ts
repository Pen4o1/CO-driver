import { Directory, File, Paths } from 'expo-file-system';

import type { LocalFile } from './TtsProvider';

export type VoiceFileStore = {
  writeMp3(name: string, bytes: Uint8Array): Promise<LocalFile>;
  stat(name: string): Promise<LocalFile | null>;
};

export function createMemoryFileStore(): VoiceFileStore {
  const files = new Map<string, { uri: string; bytes: Uint8Array }>();
  return {
    async writeMp3(name, bytes) {
      const uri = `memory://voice/${name}`;
      files.set(name, { uri, bytes });
      return { uri, bytes: bytes.byteLength, live: false };
    },
    async stat(name) {
      const hit = files.get(name);
      if (!hit) return null;
      return { uri: hit.uri, bytes: hit.bytes.byteLength, live: false };
    },
  };
}

export function createDocumentFileStore(): VoiceFileStore {
  const dir = new Directory(Paths.document, 'voice');
  return {
    async writeMp3(name, bytes) {
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }
      const file = new File(dir, name);
      if (!file.exists) {
        file.create();
      }
      file.write(bytes);
      return { uri: file.uri, bytes: bytes.byteLength, live: false };
    },
    async stat(name) {
      const file = new File(dir, name);
      if (!file.exists) {
        return null;
      }
      return { uri: file.uri, bytes: file.size, live: false };
    },
  };
}
