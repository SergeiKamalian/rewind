import type { BaseEvent, EventType } from "./types/event.js";
import type { EventDataMap, RewindEvent } from "./types/events.js";

/**
 * Session format version stored in the meta event.
 * `version()` returns this value.
 */
export const FORMAT_VERSION = 1;

/**
 * Time source for one recording.
 * Pass the same instance to every {@link createEvent} call in that recording.
 */
export interface Clock {
  /** Milliseconds since session start. */
  now(): number;
}

/**
 * Builds an event and fills `seq` and `timestamp` from `clock`.
 *
 * @typeParam T - Event kind.
 */
export function createEvent<T extends EventType>(
  _type: T,
  _data: EventDataMap[T],
  _clock: Clock,
): BaseEvent<T, EventDataMap[T]> {
  throw new Error("not implemented");
}

/**
 * Narrows an event to one kind.
 *
 * @typeParam T - Event kind to test for.
 */
export function isEventOfType<T extends EventType>(
  _event: RewindEvent,
  _type: T,
): _event is Extract<RewindEvent, { type: T }> {
  throw new Error("not implemented");
}
