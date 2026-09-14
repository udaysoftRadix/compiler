import { useEffect, useMemo, useRef } from 'react';
import type { Bundle } from '../compiler/buildBundle';
import { buildPreviewDocument } from '../compiler/previewDocument';
import type { ConsoleEntry } from '../types';

interface PreviewPaneProps {
  bundle: Bundle;
  refreshKey: number;
  reactMode: boolean;
  onConsoleEntry: (entry: ConsoleEntry) => void;
  onRuntimeError: (message: string) => void;
}

let entryId = 0;
function nextId() {
  entryId += 1;
  return `console-${entryId}`;
}

export function PreviewPane({ bundle, refreshKey, reactMode, onConsoleEntry, onRuntimeError }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingBundleRef = useRef<Bundle | null>(null);
  const doc = useMemo(() => buildPreviewDocument(reactMode), [refreshKey, reactMode]);

  useEffect(() => {
    readyRef.current = false;
  }, [doc]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.source !== 'react-compiler-preview') return;

      if (data.type === 'ready') {
        readyRef.current = true;
        if (pendingBundleRef.current) {
          postBundle(pendingBundleRef.current);
        }
        return;
      }

      if (data.type === 'console') {
        onConsoleEntry({ id: nextId(), level: data.level, text: data.text, timestamp: Date.now() });
        return;
      }

      if (data.type === 'runtime-error') {
        onRuntimeError(data.message);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleEntry, onRuntimeError]);

  function postBundle(b: Bundle) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ source: 'react-compiler-host', type: 'bundle', modules: b.modules, entry: b.entry }, '*');
  }

  useEffect(() => {
    if (bundle.error) return;
    pendingBundleRef.current = bundle;
    if (readyRef.current) {
      postBundle(bundle);
    }
  }, [bundle]);

  return (
    <iframe
      ref={iframeRef}
      key={refreshKey}
      title="Preview"
      srcDoc={doc}
      sandbox="allow-scripts allow-modals allow-popups allow-forms"
      style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
    />
  );
}
