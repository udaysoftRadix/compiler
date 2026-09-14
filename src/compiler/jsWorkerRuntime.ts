// Source for a Web Worker that executes a transpiled JS/TS bundle in
// isolation from the main thread. Running in a worker (instead of an
// iframe) means an infinite loop in user code cannot freeze the page —
// it just hangs the worker, which the host can terminate.
export const jsWorkerRuntimeSource = /* js */ `
var moduleCache = {};
var stdinLines = [];
var stdinIndex = 0;

function post(payload) {
  self.postMessage(Object.assign({ source: 'js-compiler-worker' }, payload));
}

function serialize(arg) {
  try {
    if (arg instanceof Error) return arg.stack || arg.message;
    if (typeof arg === 'string') return arg;
    return JSON.stringify(arg, null, 2);
  } catch (e) {
    try { return String(arg); } catch (e2) { return '[Unserializable value]'; }
  }
}

['log', 'info', 'warn', 'error'].forEach(function (level) {
  console[level] = function () {
    var args = Array.prototype.slice.call(arguments);
    post({ type: 'console', level: level, text: args.map(serialize).join(' ') });
  };
});

self.addEventListener('error', function (e) {
  post({ type: 'runtime-error', message: e.message });
});

self.addEventListener('unhandledrejection', function (e) {
  var reason = e.reason;
  post({ type: 'runtime-error', message: 'Unhandled promise rejection: ' + (reason && reason.stack ? reason.stack : serialize(reason)) });
});

self.readLine = function () {
  if (stdinIndex >= stdinLines.length) return null;
  return stdinLines[stdinIndex++];
};
self.readLineSync = self.readLine;

function baseName(name) {
  return name.replace(/^\\.\\//, '').replace(/\\.(ts|js)$/, '');
}

function resolveModuleName(requestPath, modules) {
  var target = baseName(requestPath);
  var keys = Object.keys(modules);
  for (var i = 0; i < keys.length; i++) {
    if (baseName(keys[i]) === target) return keys[i];
  }
  return null;
}

function requireModule(modules, name) {
  var resolved = resolveModuleName(name, modules);
  if (!resolved) {
    throw new Error('Module not found: "' + name + '". Only local files are available in this compiler.');
  }
  if (moduleCache[resolved]) return moduleCache[resolved].exports;

  var moduleObj = { exports: {} };
  moduleCache[resolved] = moduleObj;

  var localRequire = function (p) { return requireModule(modules, p); };
  var fn = new Function('module', 'exports', 'require', 'readLine', modules[resolved].code);
  fn(moduleObj, moduleObj.exports, localRequire, self.readLine);
  return moduleObj.exports;
}

self.addEventListener('message', function (event) {
  var data = event.data;
  if (!data || data.type !== 'run') return;

  moduleCache = {};
  stdinLines = (data.stdin || '').split('\\n');
  stdinIndex = 0;

  var startedAt = Date.now();
  try {
    if (!data.entry) throw new Error('No entry file found. Mark a file as the entry point.');
    var exportsObj = requireModule(data.modules, data.entry);
    if (exportsObj && typeof exportsObj.default === 'function') {
      exportsObj.default();
    }
    post({ type: 'done', elapsedMs: Date.now() - startedAt });
  } catch (err) {
    post({ type: 'runtime-error', message: err && err.stack ? err.stack : String(err) });
    post({ type: 'done', elapsedMs: Date.now() - startedAt, failed: true });
  }
});

post({ type: 'ready' });
`;
