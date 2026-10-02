import type { DocumentNode, SerializedNode } from "./dom.js";
import type { BaseEvent, EventType } from "./event.js";

/**
 * A JSON value that can be stored in a recording.
 * Functions, `undefined`, and class instances are left out.
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Width and height in CSS pixels. */
export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Opening record for a session.
 * `startTime` is epoch milliseconds. Event `timestamp` is the offset
 * from this instant.
 */
export interface MetaEventData {
  /** Session format version. */
  version: number;
  /** Id of this recording. */
  sessionId: string;
  /** Epoch milliseconds when the session started. */
  startTime: number;
  /** Page URL at the start of the session. */
  url: string;
  /** Browser user agent at the start of the session. */
  userAgent: string;
  /** Viewport at the start of the session. */
  viewport: ViewportSize;
}

/**
 * Full DOM tree captured at the start of a session.
 * The serializer that builds `node` arrives later.
 */
export interface FullSnapshotEventData {
  /** Document root, including its children. */
  node: DocumentNode;
}

/** A node inserted into a parent. */
export interface MutationAdd {
  /** Id of the parent the node was inserted under. */
  parentId: number;
  /** Id of the next sibling. `null` appends the node. */
  nextId: number | null;
  /** Inserted node, including any children. */
  node: SerializedNode;
}

/** A node removed from a parent. */
export interface MutationRemove {
  /** Id of the parent the node was removed from. */
  parentId: number;
  /** Id of the removed node. */
  id: number;
}

/**
 * One attribute change on an element.
 * `true` stores a boolean attribute. `null` removes the attribute.
 */
export interface MutationAttribute {
  /** Id of the element. */
  id: number;
  /** Attribute name. */
  name: string;
  /** New value, or `null` when the attribute was removed. */
  value: string | true | null;
}

/** A text, comment, or CDATA value change. */
export interface MutationText {
  /** Id of the text-like node. */
  id: number;
  /** New text. */
  value: string;
}

/**
 * Incremental DOM change.
 * Each list is present even when that kind of change did not happen.
 */
export interface MutationEventData {
  /** Nodes inserted in this batch. */
  adds: MutationAdd[];
  /** Nodes removed in this batch. */
  removes: MutationRemove[];
  /** Attribute changes in this batch. */
  attributes: MutationAttribute[];
  /** Text changes in this batch. */
  texts: MutationText[];
}

/** One sample in a batched mouse-move event. */
export interface MousePosition {
  /** Viewport x, in CSS pixels. */
  x: number;
  /** Viewport y, in CSS pixels. */
  y: number;
  /** Milliseconds after the event timestamp. */
  timeOffset: number;
}

/** Batched pointer positions. */
export interface MouseMoveEventData {
  /** Positions in time order. */
  positions: MousePosition[];
}

/**
 * Pointer and focus interactions recorded on a target node.
 * Focus and blur still carry x and y; use `0` when the browser
 * does not report a point.
 */
export type MouseInteractionKind =
  | "click"
  | "dblclick"
  | "mousedown"
  | "mouseup"
  | "focus"
  | "blur";

/**
 * Mouse interaction names, in canonical order.
 * Stubbed empty until the implementation fills the list.
 */
export const MOUSE_INTERACTIONS: readonly MouseInteractionKind[] = [];

/** A click, double-click, button change, focus, or blur. */
export interface MouseInteractionEventData {
  /** Which interaction happened. */
  interaction: MouseInteractionKind;
  /** Id of the target node. */
  id: number;
  /** Viewport x, in CSS pixels. */
  x: number;
  /** Viewport y, in CSS pixels. */
  y: number;
}

/** Scroll position of a node. */
export interface ScrollEventData {
  /** Id of the scrolled node. */
  id: number;
  /** Horizontal scroll offset. */
  x: number;
  /** Vertical scroll offset. */
  y: number;
}

/**
 * Text entered into a control.
 * `kind` keeps this from being confused with a checked control.
 * `masked` is true for secrets.
 */
export interface InputValueData {
  /** Id of the control. */
  id: number;
  /** Text control, as opposed to a checkbox or radio. */
  kind: "value";
  /** Current text value. */
  value: string;
  /** True when the value must not be stored in clear text. */
  masked: boolean;
}

/**
 * Checked state of a checkbox or radio.
 * `kind` keeps this from being confused with a text control.
 */
export interface InputCheckedData {
  /** Id of the control. */
  id: number;
  /** Checkbox or radio, as opposed to a text control. */
  kind: "checked";
  /** Current checked state. */
  checked: boolean;
  /** True when the value must not be stored in clear text. */
  masked: boolean;
}

/**
 * An input change.
 * Text controls carry `value`. Checkbox and radio controls carry `checked`.
 */
export type InputEventData = InputValueData | InputCheckedData;

/** Viewport after a resize. Same shape as {@link ViewportSize}. */
export type ViewportResizeEventData = ViewportSize;

/**
 * One network call.
 * `null` marks a field the browser did not provide: a missing status,
 * an unfinished call, an unknown size, or no error.
 */
export interface NetworkEventData {
  /** Id that ties this call together in the recording. */
  requestId: string;
  /** HTTP method. */
  method: string;
  /** Request URL. */
  url: string;
  /** HTTP status, or `null` when there was no response. */
  status: number | null;
  /** Milliseconds since session start when the request started. */
  start: number;
  /** Milliseconds since session start when the request finished. */
  end: number | null;
  /** Request size in bytes, or `null` when unknown. */
  requestSize: number | null;
  /** Response size in bytes, or `null` when unknown. */
  responseSize: number | null;
  /** Failure message, or `null` when the call succeeded. */
  error: string | null;
}

/** Console method recorded for a call. */
export type ConsoleLevel = "log" | "info" | "warn" | "error";

/**
 * Console levels, in canonical order.
 * Stubbed empty until the implementation fills the list.
 */
export const CONSOLE_LEVELS: readonly ConsoleLevel[] = [];

/**
 * A console call.
 * `args` are serialized and truncated by the recorder. `stack` is
 * `null` when the call has no stack.
 */
export interface ConsoleEventData {
  /** Console method. */
  level: ConsoleLevel;
  /** Serialized arguments, in call order. */
  args: JsonValue[];
  /** Stack text, or `null` when absent. */
  stack: string | null;
}

/** Source of a recorded exception. */
export type ErrorKind = "error" | "unhandledrejection";

/**
 * Error kinds, in canonical order.
 * Stubbed empty until the implementation fills the list.
 */
export const ERROR_KINDS: readonly ErrorKind[] = [];

/**
 * A window error or an unhandled promise rejection.
 * Location fields are `null` when the browser did not report them.
 */
export interface ErrorEventData {
  /** Error message. */
  message: string;
  /** Stack text, or `null` when absent. */
  stack: string | null;
  /** Script URL, or `null` when absent. */
  source: string | null;
  /** 1-based line, or `null` when absent. */
  line: number | null;
  /** 1-based column, or `null` when absent. */
  column: number | null;
  /** `error` for `window.onerror`, `unhandledrejection` for a promise. */
  kind: ErrorKind;
}

/** A user-supplied event, tagged and carrying a JSON payload. */
export interface CustomEventData {
  /** Name the host app uses to recognize this event. */
  tag: string;
  /** JSON payload supplied by the host app. */
  payload: JsonValue;
}

/**
 * Payload for each event kind.
 * The keys are exactly {@link EventType}.
 */
export interface EventDataMap {
  meta: MetaEventData;
  full_snapshot: FullSnapshotEventData;
  mutation: MutationEventData;
  mouse_move: MouseMoveEventData;
  mouse_interaction: MouseInteractionEventData;
  scroll: ScrollEventData;
  input: InputEventData;
  viewport_resize: ViewportResizeEventData;
  network: NetworkEventData;
  console: ConsoleEventData;
  error: ErrorEventData;
  custom: CustomEventData;
}

/** Session meta event. */
export type MetaEvent = BaseEvent<"meta", EventDataMap["meta"]>;
/** Full DOM snapshot event. */
export type FullSnapshotEvent = BaseEvent<
  "full_snapshot",
  EventDataMap["full_snapshot"]
>;
/** DOM mutation event. */
export type MutationEvent = BaseEvent<"mutation", EventDataMap["mutation"]>;
/** Batched mouse-move event. */
export type MouseMoveEvent = BaseEvent<
  "mouse_move",
  EventDataMap["mouse_move"]
>;
/** Mouse or focus interaction event. */
export type MouseInteractionEvent = BaseEvent<
  "mouse_interaction",
  EventDataMap["mouse_interaction"]
>;
/** Scroll event. */
export type ScrollEvent = BaseEvent<"scroll", EventDataMap["scroll"]>;
/** Input event. */
export type InputEvent = BaseEvent<"input", EventDataMap["input"]>;
/** Viewport resize event. */
export type ViewportResizeEvent = BaseEvent<
  "viewport_resize",
  EventDataMap["viewport_resize"]
>;
/** Network event. */
export type NetworkEvent = BaseEvent<"network", EventDataMap["network"]>;
/** Console event. */
export type ConsoleEvent = BaseEvent<"console", EventDataMap["console"]>;
/** Error event. */
export type ErrorEvent = BaseEvent<"error", EventDataMap["error"]>;
/** Custom event. */
export type CustomEvent = BaseEvent<"custom", EventDataMap["custom"]>;

/**
 * Every event in a session.
 * Narrow on `type` to read that kind's `data`.
 */
export type RewindEvent = {
  [T in EventType]: BaseEvent<T, EventDataMap[T]>;
}[EventType];
