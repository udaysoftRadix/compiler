import LZString from 'lz-string';
import type { ProjectFile } from '../types';

export function encodeToHash(value: unknown): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(value));
}

export function decodeFromHash<T>(hash: string): T | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function encodeFilesToHash(files: ProjectFile[]): string {
  return encodeToHash(files);
}

export function decodeFilesFromHash(hash: string): ProjectFile[] | null {
  const parsed = decodeFromHash<ProjectFile[]>(hash);
  return Array.isArray(parsed) ? parsed : null;
}
