import type { ProjectFile } from '../types';
import { transpileModule } from './transpile';

export interface BundleModule {
  code: string;
  isCss: boolean;
}

export interface Bundle {
  modules: Record<string, BundleModule>;
  entry: string | null;
  error: { file: string; message: string } | null;
}

export function buildBundle(files: ProjectFile[]): Bundle {
  const modules: Record<string, BundleModule> = {};
  const entry = files.find((f) => f.isEntry)?.name ?? files[0]?.name ?? null;

  for (const file of files) {
    const { code, error } = transpileModule(file.name, file.content);
    if (error || code === null) {
      return {
        modules,
        entry,
        error: { file: file.name, message: error ?? 'Unknown transpile error' },
      };
    }
    modules[file.name] = { code, isCss: file.name.endsWith('.css') };
  }

  return { modules, entry, error: null };
}
