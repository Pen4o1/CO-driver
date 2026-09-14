import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

export async function sha256Hex(value: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, value);
}
