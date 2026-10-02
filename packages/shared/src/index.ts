/**
 * Returns the session format version.
 * Every recording starts with this version in its meta event.
 */
export function version(): number {
  return 1;
}

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
