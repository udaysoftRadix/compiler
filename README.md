# Online Code Compiler — React, JavaScript & 26 Other Languages

An in-browser coding platform with several execution models suited to what
each language is for. Every mode defaults to a plain **Hello World** on
first visit.

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
- **`/compiler/:language`** — the same judge-style Input/Output/Run UI, for
  **26 other languages**: C, C++, C#, Java, Kotlin, Python, Ruby, Perl, Lua,
  Go, Rust, Swift, Objective-C, D, Haskell, OCaml, Pascal, Ada, Dart,
  Crystal, Julia, Zig, COBOL, F#, Visual Basic .NET, and SQL. A language switcher
  in the toolbar jumps straight to any of them. `/c` redirects here for
  backward compatibility. Real compilation for this many languages can't
  happen client-side without shipping a huge native toolchain per language,
  so this mode sends source + stdin to
  [Compiler Explorer](https://godbolt.org)'s public, keyless execute API
  (the same kind of sandboxed backend real online compilers use) and
  streams back stdout/stderr/compiler diagnostics. This mode needs network
  access; React and JS are fully client-side/offline-capable.

`/` redirects to `/react`. A nav switcher in the toolbar moves between all of these.

> **Note on language coverage:** "all languages" isn't literal — it's
> bounded by what a free, keyless, CORS-enabled execution API will run.
> PHP isn't offered by Compiler Explorer at all. Erlang, Nim, Scala, and
> Clojure are listed there but their execution step is currently broken on
> that backend (missing binaries / runtime classpath) independent of
> anything in this app, so they were tested and dropped rather than shipped
> broken. paiza.io was tried first — it has a much simpler language-name API
> and initially looked like a good fit — but it sends no
> `Access-Control-Allow-Origin` header, so browsers block it outright; it
> only "works" from curl/servers, never from client-side `fetch`. That's why
> Compiler Explorer is the backend here even for C, which originally used a
> different one.

## Features

Shared:
- **Monaco-based editor**
- **Shareable links** (project state compressed into the URL hash),
  **Download**, **Reset** to defaults
- Per-mode `localStorage`, so switching tabs doesn't clobber another
  playground's work

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

Other languages (`/compiler/:language`) specific:
- Single source file per language, real compiler diagnostics (with file/line
  context where the compiler provides it) on failure, real stdout/stderr on
  success
- Same Run/Stop + status-badged Output panel as JS mode; a 25s client-side
  timeout backstops the service's own ~20s execution limit

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

**SQL** is the exception: Compiler Explorer has no SQL, so it runs locally
on SQLite compiled to WebAssembly ([sql.js](https://github.com/sql-js/sql.js))
inside a Web Worker. It gets its own layout: a schema sidebar (left), the
editor with `SELECT` results rendered as real tables (centre), and an
"Available Tables" data panel (right); both side panels can be toggled. Every
Run starts from a fresh in-memory database preloaded with `Customers`,
`Orders` and `Shippings` (defined in `src/compiler/sqlSeed.ts`, which drives
both the UI panels and the seed SQL), so changes never carry over. DML reports
rows affected, an error stops the script (keeping earlier output), and a 10s
hard timeout kills runaway queries. No network or Input box is needed.

**The other-languages mode** works differently since it needs real
compilers: on Run, the source and Input box text are POSTed to Compiler
Explorer's execute API (`https://godbolt.org/api/compiler/<id>/compile`,
`filters.execute: true`), where `<id>` is a specific compiler version picked
per language in `src/data/languages.ts` (e.g. `cg151` for C, `python314` for
Python). The response's build diagnostics (on a compile failure) or
stdout/stderr (on success) are rendered into the Output panel; the client
also enforces its own timeout via `AbortController` as a backstop alongside
the service's own.

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
  Compiler Explorer client (`runOnCompilerExplorer.ts`, used by every other
  language)
- `src/components/` — editor, file tabs, toolbar (shared); preview/console
  (React mode); input/output panels (JS & other-language modes)
- `src/pages/CompilerWorkspace.tsx` + `ReactCompilerPage.tsx` — the React
  mode's layout/state, mounted at `/react`
- `src/pages/JsCompilerPage.tsx` — the JS mode's layout/state (Run/Stop,
  stdin/stdout), mounted at `/js`
- `src/pages/CompilerPage.tsx` — the generic per-language layout/state,
  mounted at `/compiler/:language`; falls back to C on an unknown language id
- `src/data/reactTemplates.ts` / `jsTemplates.ts` — starter templates for
  React and JS
- `src/data/languages.ts` — the 26 supported languages: route id, Compiler
  Explorer compiler id (or `runtime: 'sqlite'` for SQL), Monaco syntax-highlighting id, filename, and a
  verified Hello World template for each
- `src/assets/lang-icons/` — one SVG logo per language (from [devicon](https://devicon.dev), MIT, and [simple-icons](https://simpleicons.org), CC0; Pascal's is a simple monogram), rendered by `LanguageIcon`
- `src/App.tsx` — router shell (`react-router-dom`)
