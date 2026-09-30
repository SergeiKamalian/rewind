import { version } from "@rewind/shared";
import { type FormEvent, type ReactElement, useState } from "react";

type Todo = {
  id: string;
  title: string;
  done: boolean;
};

/**
 * Demo todo list. Later tasks record this app and plant bugs in it.
 */
export function App(): ReactElement {
  const [title, setTitle] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);

  function addTodo(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextTitle = title.trim();
    if (nextTitle.length === 0) {
      return;
    }

    setTodos((current) => [
      ...current,
      { id: crypto.randomUUID(), title: nextTitle, done: false },
    ]);
    setTitle("");
  }

  function toggleTodo(id: string): void {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo,
      ),
    );
  }

  function deleteTodo(id: string): void {
    // QA demo: planted bug. Deletes the first todo instead of the clicked one.
    void id;
    setTodos((current) => current.slice(1));
  }

  return (
    <div className="page">
      <main className="card">
        <header className="header">
          <h1>Todos</h1>
          <p>Add a task, mark it done, or delete it.</p>
        </header>
        <form className="composer" onSubmit={addTodo}>
          <label className="composer-label" htmlFor="todo-title">
            New todo
          </label>
          <div className="composer-row">
            <input
              id="todo-title"
              name="title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder="Walk the dog"
              autoComplete="off"
            />
            <button type="submit">Add</button>
          </div>
        </form>
        {todos.length === 0 ? (
          <p className="empty">No todos yet.</p>
        ) : (
          <ul className="todos">
            {todos.map((todo) => (
              <li key={todo.id} className={todo.done ? "todo done" : "todo"}>
                <label className="todo-main">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => {
                      toggleTodo(todo.id);
                    }}
                  />
                  <span>{todo.title}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    deleteTodo(todo.id);
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="footer">Format version {version()}</footer>
    </div>
  );
}
