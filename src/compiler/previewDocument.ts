import { createRuntimeScript } from './runtimeScript';

export function buildPreviewDocument(reactMode: boolean): string {
  const reactScripts = reactMode
    ? `
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { height: 100%; margin: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; }
      #root { min-height: 100%; }
      #error-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(20, 0, 0, 0.92);
        color: #ff8080;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 13px;
        white-space: pre-wrap;
        padding: 20px;
        overflow: auto;
        z-index: 999999;
      }
    </style>${reactScripts}
  </head>
  <body>
    <div id="root"></div>
    <pre id="error-overlay"></pre>
    <script>${createRuntimeScript(reactMode)}</script>
  </body>
</html>`;
}
