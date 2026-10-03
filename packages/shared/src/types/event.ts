/**
 * Every event kind, in canonical order.
 * `EventType` is derived from this list so the runtime values and the
 * type stay the same.
 */
export const EVENT_TYPES = [
  "meta",
  "full_snapshot",
  "mutation",
  "mouse_move",
  "mouse_interaction",
  "scroll",
  "input",
  "viewport_resize",
  "network",
  "console",
  "error",
  "custom",
] as const;

/**
 * Event kinds the session format can record.
 * The payload for each kind is attached through {@link BaseEvent}.
 */
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Envelope shared by every event in a session.
 *
 * `seq` is strictly increasing inside one session, so two events that
 * share a millisecond still have a total order. `timestamp` is
 * milliseconds since session start.
 *
 * @typeParam T - Event kind.
 * @typeParam D - Payload for that kind.
 */
export interface BaseEvent<T extends EventType, D> {
  /** Discriminant for this event. */
  type: T;
  /** Strictly increasing sequence number for this session. */
  seq: number;
  /** Milliseconds since session start. */
  timestamp: number;
  /** Payload for this event kind. */
  data: D;
}
