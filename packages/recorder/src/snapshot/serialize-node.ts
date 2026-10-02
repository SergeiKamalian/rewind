import type { SerializedNode } from "@rewind/shared";
import type { Mirror } from "../mirror.js";

/**
 * Options for serializing a DOM node into the session format.
 */
export interface SerializeContext {
  /** Id registry for this recording. */
  readonly mirror: Mirror;
}

/**
 * Serializes one DOM node and its children into the session format.
 *
 * Returns `undefined` for node kinds that are not recorded.
 * Ids come from `ctx.mirror`.
 */
export function serializeNode(
  node: Node,
  ctx: SerializeContext,
): SerializedNode | undefined {
  void node;
  void ctx;
  throw new Error("not implemented");
}
