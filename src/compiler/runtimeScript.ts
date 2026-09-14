// This script is injected verbatim into the sandboxed preview iframe.
// It is plain browser JS (not processed by Vite/TS) because it runs
// inside the iframe's own document, evaluated via a <script> tag.
export function createRuntimeScript(reactMode: boolean): string {
  return `
(function () {
  var REACT_MODE = ${reactMode ? 'true' : 'false'};
  var moduleCache = {};
  var currentStyleEl = null;

  function post(payload) {
    window.parent.postMessage(Object.assign({ source: 'react-compiler-preview' }, payload), '*');
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
    var original = console[level];
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      post({ type: 'console', level: level, text: args.map(serialize).join(' ') });
      original.apply(console, args);
    };
  });

  window.addEventListener('error', function (e) {
    post({ type: 'runtime-error', message: e.message + (e.error && e.error.stack ? '\\n' + e.error.stack : '') });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    post({ type: 'runtime-error', message: 'Unhandled promise rejection: ' + (reason && reason.stack ? reason.stack : serialize(reason)) });
  });

  function baseName(name) {
    return name.replace(/^\\.\\//, '').replace(/\\.(jsx|tsx|ts|js|css)$/, '');
  }

  function resolveModuleName(requestPath, modules) {
    var target = baseName(requestPath);
    var keys = Object.keys(modules);
    for (var i = 0; i < keys.length; i++) {
      if (baseName(keys[i]) === target) return keys[i];
    }
    return null;
  }

  function showErrorOverlay(message) {
    var overlay = document.getElementById('error-overlay');
    overlay.textContent = message;
    overlay.style.display = 'block';
  }

  function clearErrorOverlay() {
    var overlay = document.getElementById('error-overlay');
    overlay.style.display = 'none';
    overlay.textContent = '';
  }

  function runBundle(data) {
    var modules = data.modules;
    moduleCache = {};
    clearErrorOverlay();

    if (currentStyleEl) {
      currentStyleEl.remove();
      currentStyleEl = null;
    }
    var css = Object.keys(modules)
      .filter(function (name) { return modules[name].isCss; })
      .map(function (name) { return modules[name].code; })
      .join('\\n');
    if (css) {
      currentStyleEl = document.createElement('style');
      currentStyleEl.id = 'user-styles';
      currentStyleEl.textContent = css;
      document.head.appendChild(currentStyleEl);
    }

    if (!REACT_MODE) {
      var rootEl = document.getElementById('root');
      if (rootEl) rootEl.innerHTML = '';
    }

    function requireModule(name, fromFile) {
      if (REACT_MODE) {
        if (name === 'react') return window.React;
        if (name === 'react-dom') return window.ReactDOM;
        if (name === 'react-dom/client') return window.ReactDOM;
      }

      var resolved = resolveModuleName(name, modules);
      if (!resolved) {
        var hint = REACT_MODE ? ' Only local files and "react" / "react-dom" are available in this playground.' : ' Only local files are available in this playground.';
        throw new Error('Module not found: "' + name + '".' + hint);
      }

      if (moduleCache[resolved]) return moduleCache[resolved].exports;

      var mod = modules[resolved];
      if (mod.isCss) {
        moduleCache[resolved] = { exports: {} };
        return {};
      }

      var moduleObj = { exports: {} };
      moduleCache[resolved] = moduleObj;

      var localRequire = function (p) { return requireModule(p, resolved); };
      var fn = new Function('module', 'exports', 'require', 'React', mod.code);
      fn(moduleObj, moduleObj.exports, localRequire, window.React);
      return moduleObj.exports;
    }

    try {
      if (!data.entry) throw new Error('No entry file found. Mark a file as the entry point.');
      var entryExports = requireModule(data.entry, null);

      if (REACT_MODE) {
        var Component = entryExports && (entryExports.default || entryExports);
        if (typeof Component !== 'function') {
          throw new Error('The entry file ("' + data.entry + '") must have a default export that is a React component.');
        }
        var root = window.__reactRoot || (window.__reactRoot = window.ReactDOM.createRoot(document.getElementById('root')));
        root.render(window.React.createElement(Component));
      } else if (entryExports && typeof entryExports.default === 'function') {
        entryExports.default();
      }
    } catch (err) {
      showErrorOverlay(err && err.stack ? err.stack : String(err));
      post({ type: 'runtime-error', message: err && err.stack ? err.stack : String(err) });
    }
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== 'react-compiler-host') return;
    if (data.type === 'bundle') runBundle(data);
  });

  post({ type: 'ready' });
})();
`;
}
