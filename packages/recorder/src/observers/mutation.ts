import type { MutationEvent } from "@rewind/shared";
import type { SnapshotContext } from "../snapshot/take-full-snapshot.js";

/**
 * A live mutation watch.
 * `stop` disconnects it from the document.
 */
export interface MutationObservation {
  /** Disconnects the observer. Later DOM changes are not recorded. */
  stop(): void;
}

/**
 * Observes `document` and emits one `mutation` event per observer callback.
 *
 * Added nodes are serialized with the snapshot serializer on `ctx`.
 * `stop` disconnects the observer.
 */
export function observeMutations(
  document: Document,
  ctx: SnapshotContext,
  emit: (event: MutationEvent) => void,
): MutationObservation {
  void document;
  void ctx;
  void emit;
  throw new Error("not implemented");
}
