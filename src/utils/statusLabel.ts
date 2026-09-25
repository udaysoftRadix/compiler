export function statusLabel(status: 'idle' | 'running' | 'done' | 'timeout', elapsedMs: number | null) {
  switch (status) {
    case 'running':
      return 'Running…';
    case 'done':
      return elapsedMs !== null ? `Finished in ${elapsedMs}ms` : 'Finished';
    case 'timeout':
      return 'Time limit exceeded';
    default:
      return 'Ready';
  }
}
