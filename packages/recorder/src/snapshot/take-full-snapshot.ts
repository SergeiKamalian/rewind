import type { Clock, FullSnapshotEvent } from "@rewind/shared";
import type { PrivacyOptions } from "../privacy.js";
import type { SerializeContext } from "./serialize-node.js";

/**
 * Inputs for one full snapshot.
 * `clock` is the recording clock, so sequence numbers stay with that recording.
 */
export interface SnapshotContext extends SerializeContext {
  /** Time and sequence source for the snapshot event. */
  readonly clock: Clock;
  /** Masking and blocking rules. Inputs are masked when this is omitted. */
  readonly privacy?: PrivacyOptions;
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
  void document;
  void ctx;
  throw new Error("not implemented");
}
