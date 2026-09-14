import * as Babel from '@babel/standalone';

export interface TranspileResult {
  code: string | null;
  error: string | null;
}

export function transpileModule(filename: string, source: string): TranspileResult {
  const ext = filename.split('.').pop() ?? '';

  if (ext === 'css') {
    return { code: source, error: null };
  }

  const isTS = ext === 'ts' || ext === 'tsx';
  const isTSX = ext === 'tsx';

  const presets: unknown[] = [];
  if (isTS) {
    presets.push(['typescript', { isTSX, allExtensions: isTSX }]);
  }
  presets.push(['react', { runtime: 'classic' }]);

  try {
    const result = Babel.transform(source, {
      filename,
      presets,
      plugins: ['transform-modules-commonjs'],
      sourceType: 'module',
      sourceMaps: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return { code: result?.code ?? '', error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { code: null, error: message };
  }
}
