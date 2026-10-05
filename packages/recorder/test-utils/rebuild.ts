import type { RewindEvent } from "@rewind/shared";

/**
 * Rebuilds a document from a full snapshot and the mutations after it.
 *
 * Test-only. The recorder package does not export this function.
 */
export function rebuild(events: readonly RewindEvent[]): Document {
  void events;
  throw new Error("not implemented");
}
