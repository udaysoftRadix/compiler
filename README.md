# Online Code Compiler — React, JavaScript & C

An in-browser coding platform with three modes, each on its own route, with
different execution models suited to what they're for. All three default to
a plain **Hello World** on first visit.

- **`/react`** — a JSX/TSX component playground with a **live rendered
  preview**. Components import each other and `react`/`react-dom`; the
  preview recompiles on a short debounce as you type, and the entry file's
  default export renders via `ReactDOM.createRoot` inside a sandboxed
  `<iframe>`.
- **`/js`** — a judge-style **JavaScript/TypeScript compiler for problem
  solving** (in the spirit of OneCompiler / competitive-programming judges):
  an editor, an **Input (stdin)** box, an **Output** panel, and an explicit
  **Run** button (or `Ctrl+Enter`). No DOM/React — just your code, `console`
  output, and `readLine()` to consume the Input box line by line. Code runs
  in a **Web Worker**, so an infinite loop hangs only the run, never the
  page — a visible **Stop** button and an 8s hard timeout ("time limit
  exceeded") both recover from it.
- **`/c`** — a judge-style **C compiler**, same Input/Output/Run UI as the JS
  mode. Real C compilation can't happen client-side without shipping a
  multi-hundred-MB clang/lld WASM toolchain, so this mode sends your source
  and stdin to [Compiler Explorer](https://godbolt.org)'s public, keyless
  execute API (the same kind of sandboxed backend real online C compilers
  use) and streams back stdout/stderr/compiler diagnostics. This mode needs
  network access; the other two are fully client-side/offline-capable.

`/` redirects to `/react`. A nav switcher in the toolbar moves between all three.

## Features

Shared:
- **Monaco-based editor**
- **Shareable links** (project state compressed into the URL hash),
  **Download**, **Reset** to defaults
- Per-mode `localStorage`, so switching tabs doesn't clobber another
  playground's work
- Starter templates per mode

React (`/react`) specific:
- Multi-file projects — local files `import` each other and `react`/`react-dom`
- Live preview in a sandboxed iframe with React/ReactDOM (UMD, via CDN)
- Console panel mirroring `console.*` and runtime errors from the preview
- Compile-error overlay for Babel syntax errors, with file/line context
- Templates: Hello World, Counter, Todo List, Fetch demo

JS (`/js`) specific:
- Multi-file projects — local files `import` each other (no DOM/React)
- Explicit **Run**/**Stop**, not live-as-you-type — appropriate for code
  that may be incomplete or contain loops while you're still writing it
- **Input panel** (stdin) + `readLine()` global to consume it line by line
- **Output panel** with a status badge (Running… / Finished in Nms / Time
  limit exceeded)
- Runs in a **Web Worker**, isolated from the main thread — safe against
  infinite loops, with a hard 8s timeout as a backstop
- Templates: Hello World, Reading Input, Two Sum, Bubble Sort (multi-file),
  Fibonacci Series, Palindrome Check

C (`/c`) specific:
- Single `main.c` file, `scanf`/stdin via the Input panel, Run/Stop, and the
  same status-badged Output panel as JS mode
- Real `gcc` compilation and execution via Compiler Explorer — genuine
  compiler diagnostics (with file/line context) on syntax errors, real
  stdout/stderr/exit codes on success
- Templates: Hello World, Reading Input, Sum of Two Numbers, Factorial
  (recursion), Bubble Sort

## How it works

**React & JS modes** transpile every file with Babel Standalone
(TypeScript/JSX → CommonJS) on the main thread, then run the compiled
modules through a small CommonJS-style `require()` so local files can
`import` each other — everything happens client-side, no network required.

- **React mode**: the compiled bundle is `postMessage`d into a sandboxed
  iframe that has React/ReactDOM loaded; the runtime injects CSS and calls
  `ReactDOM.createRoot(...).render()` on the entry file's default export.
  `console.*` and errors are forwarded back to the parent for the Console
  panel.
- **JS mode**: on Run, the bundle plus the Input box's text are posted to a
  fresh Web Worker. The worker's `require()` runtime executes the entry file
  as a script (calling its default export if present), backs `readLine()`
  with the stdin text split into lines, and posts `console.*`/error/done
  events back to the page for the Output panel. Stop (or the timeout)
  terminates the worker outright.

**C mode** works differently since it needs a real compiler: on Run, the
source and Input box text are POSTed to Compiler Explorer's execute API
(`https://godbolt.org/api/compiler/<id>/compile`, `filters.execute: true`).
The response's build diagnostics (on a compile failure) or stdout/stderr (on
success) are rendered into the Output panel; the client also enforces its
own timeout via `AbortController` as a backstop alongside the service's own.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. Build for production with:

```bash
npm run build
npm run preview
```

## Project structure

- `src/compiler/` — Babel transpilation, bundle assembly, the iframe
  runtime/document (React mode), the Web Worker runtime (JS mode), and the
  remote-execution client (C mode)
- `src/components/` — editor, file tabs, toolbar (shared); preview/console
  (React mode); input/output panels (JS & C modes)
- `src/pages/CompilerWorkspace.tsx` + `ReactCompilerPage.tsx` — the React
  mode's layout/state, mounted at `/react`
- `src/pages/JsCompilerPage.tsx` — the JS mode's layout/state (Run/Stop,
  stdin/stdout), mounted at `/js`
- `src/pages/CCompilerPage.tsx` — the C mode's layout/state, mounted at `/c`
- `src/data/reactTemplates.ts` / `jsTemplates.ts` / `cTemplates.ts` —
  starter templates per mode (index 0 is always Hello World, the default)
- `src/App.tsx` — router shell (`react-router-dom`)
# compiler
