import { version } from "@rewind/shared";

export { Mirror } from "./mirror.js";
export {
  type SerializeContext,
  serializeNode,
} from "./snapshot/serialize-node.js";

/**
 * Returns the session format version this recorder writes.
 * Capturing a session arrives in a later task.
 */
export function supportedFormatVersion(): number {
  return version();
}
