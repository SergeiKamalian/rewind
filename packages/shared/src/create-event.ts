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
 * Sequence numbers are counted per instance, starting at 1.
 */
export interface Clock {
  /** Milliseconds since session start. */
  now(): number;
}

const sequences = new WeakMap<Clock, number>();

/**
 * Builds an event and fills `seq` and `timestamp` from `clock`.
 * `seq` starts at 1 and increases by 1 for each call with the same clock,
 * even when `now()` does not move.
 *
 * @typeParam T - Event kind.
 */
export function createEvent<T extends EventType>(
  type: T,
  data: EventDataMap[T],
  clock: Clock,
): BaseEvent<T, EventDataMap[T]> {
  const timestamp = clock.now();
  const seq = nextSeq(clock);
  return { type, seq, timestamp, data };
}

/**
 * Narrows an event to one kind.
 *
 * @typeParam T - Event kind to test for.
 */
export function isEventOfType<T extends EventType>(
  event: RewindEvent,
  type: T,
): event is Extract<RewindEvent, { type: T }> {
  return event.type === type;
}

function nextSeq(clock: Clock): number {
  const seq = (sequences.get(clock) ?? 0) + 1;
  sequences.set(clock, seq);
  return seq;
}
