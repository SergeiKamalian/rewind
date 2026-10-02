import type { RewindEvent } from "../types/events.js";

/**
 * One problem found while reading an untrusted value as an event.
 * `path` is empty when the value itself is the problem.
 */
export interface ParseIssue {
  /** Dotted path, with `[index]` for arrays. Example: `data.adds[0].id`. */
  path: string;
  /** What is wrong at {@link path}. */
  message: string;
}

/**
 * A successful parse or a single failure.
 * `parseEvent` returns this instead of throwing.
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseIssue };

/**
 * Parses an unknown value as a session event.
 * Returns a failure instead of throwing.
 */
export function parseEvent(_input: unknown): Result<RewindEvent> {
  throw new Error("not implemented");
}
