import {
  type Clock,
  createEvent,
  type FullSnapshotEvent,
} from "@rewind/shared";
import { type SerializeContext, serializeNode } from "./serialize-node.js";

/**
 * Inputs for one full snapshot.
 * `clock` belongs with the mirror: both are for one recording.
 */
export interface SnapshotContext extends SerializeContext {
  /** Time and sequence source for the snapshot event. */
  readonly clock: Clock;
}

/**
 * Captures `document` as a `full_snapshot` event.
 * The node tree comes from {@link serializeNode}. `seq` and `timestamp`
 * come from `ctx.clock`.
 */
export function takeFullSnapshot(
  document: Document,
  ctx: SnapshotContext,
): FullSnapshotEvent {
  const node = serializeNode(document, ctx);
  if (node === undefined || node.type !== "Document") {
    throw new Error("snapshot root must be a Document");
  }
  return createEvent("full_snapshot", { node }, ctx.clock);
}
