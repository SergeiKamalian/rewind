/**
 * Returns the session format version.
 * Every recording starts with this version in its meta event.
 */
export function version(): number {
  return 1;
}

export {
  type Clock,
  createEvent,
  FORMAT_VERSION,
  isEventOfType,
} from "./create-event.js";

export {
  type ParseIssue,
  parseEvent,
  type Result,
} from "./parse/parse-event.js";
export {
  type CDATANode,
  type CommentNode,
  type DoctypeNode,
  type DocumentNode,
  type ElementNode,
  SERIALIZED_NODE_TYPES,
  type SerializedNode,
  type SerializedNodeType,
  type TextNode,
} from "./types/dom.js";
export { type BaseEvent, EVENT_TYPES, type EventType } from "./types/event.js";
export {
  CONSOLE_LEVELS,
  type ConsoleEvent,
  type ConsoleEventData,
  type ConsoleLevel,
  type CustomEvent,
  type CustomEventData,
  ERROR_KINDS,
  type ErrorEvent,
  type ErrorEventData,
  type ErrorKind,
  type EventDataMap,
  type FullSnapshotEvent,
  type FullSnapshotEventData,
  type InputCheckedData,
  type InputEvent,
  type InputEventData,
  type InputValueData,
  type JsonValue,
  type MetaEvent,
  type MetaEventData,
  MOUSE_INTERACTIONS,
  type MouseInteractionEvent,
  type MouseInteractionEventData,
  type MouseInteractionKind,
  type MouseMoveEvent,
  type MouseMoveEventData,
  type MousePosition,
  type MutationAdd,
  type MutationAttribute,
  type MutationEvent,
  type MutationEventData,
  type MutationRemove,
  type MutationText,
  type NetworkEvent,
  type NetworkEventData,
  type RewindEvent,
  type ScrollEvent,
  type ScrollEventData,
  type ViewportResizeEvent,
  type ViewportResizeEventData,
  type ViewportSize,
} from "./types/events.js";
