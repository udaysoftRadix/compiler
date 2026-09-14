import type { Template } from '../types';

export const reactTemplates: Template[] = [
  {
    id: 'hello-world',
    label: 'Hello World',
    files: [
      {
        name: 'App.jsx',
        isEntry: true,
        content: `export default function App() {
  return (
    <div className="card">
      <h1>Hello, React! 👋</h1>
      <p>Edit <code>App.jsx</code> and see it update live.</p>
    </div>
  );
}
`,
      },
      {
        name: 'styles.css',
        content: `body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
}

.card {
  text-align: center;
  padding: 2rem 3rem;
  border-radius: 12px;
  background: #1e293b;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

code {
  background: rgba(255,255,255,0.1);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
`,
      },
    ],
  },
  {
    id: 'counter',
    label: 'Counter (useState)',
    files: [
      {
        name: 'App.jsx',
        isEntry: true,
        content: `import { useState } from 'react';
import Counter from './Counter.jsx';

export default function App() {
  return (
    <div className="wrap">
      <h1>Counter Demo</h1>
      <Counter start={0} />
    </div>
  );
}
`,
      },
      {
        name: 'Counter.jsx',
        content: `import { useState } from 'react';

export default function Counter({ start = 0 }) {
  const [count, setCount] = useState(start);

  return (
    <div className="counter">
      <button onClick={() => setCount((c) => c - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
}
`,
      },
      {
        name: 'styles.css',
        content: `body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
}

.wrap { text-align: center; }

.counter {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.counter button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  border: none;
  background: #6366f1;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
}

.counter button:hover { background: #4f46e5; }

.counter span {
  font-size: 1.5rem;
  min-width: 2rem;
}
`,
      },
    ],
  },
  {
    id: 'todo',
    label: 'Todo List',
    files: [
      {
        name: 'App.jsx',
        isEntry: true,
        content: `import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', done: true },
    { id: 2, text: 'Build something cool', done: false },
  ]);
  const [text, setText] = useState('');

  function addTodo(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setTodos((t) => [...t, { id: Date.now(), text, done: false }]);
    setText('');
  }

  function toggle(id) {
    setTodos((t) => t.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  }

  return (
    <div className="app">
      <h1>Todo List</h1>
      <form onSubmit={addTodo}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task..." />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} onClick={() => toggle(todo.id)} className={todo.done ? 'done' : ''}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
      },
      {
        name: 'styles.css',
        content: `body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  justify-content: center;
  padding-top: 3rem;
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
}

.app { width: 320px; }

form { display: flex; gap: 0.5rem; margin: 1rem 0; }

input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  background: #6366f1;
  color: white;
  cursor: pointer;
}

ul { list-style: none; padding: 0; }

li {
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  background: #1e293b;
  margin-bottom: 0.4rem;
  cursor: pointer;
}

li.done { text-decoration: line-through; opacity: 0.5; }
`,
      },
    ],
  },
  {
    id: 'fetch',
    label: 'Fetch API Demo',
    files: [
      {
        name: 'App.jsx',
        isEntry: true,
        content: `import { useEffect, useState } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/todos/1')
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(String(err)));
  }, []);

  return (
    <div className="wrap">
      <h1>Fetch Demo</h1>
      {error && <p style={{ color: 'salmon' }}>{error}</p>}
      {!data && !error && <p>Loading...</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
`,
      },
      {
        name: 'styles.css',
        content: `body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: 2rem;
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
}
pre {
  background: #1e293b;
  padding: 1rem;
  border-radius: 8px;
  overflow: auto;
}
`,
      },
    ],
  },
];

export const defaultReactTemplate = reactTemplates[0];
