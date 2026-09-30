import { version } from "@rewind/shared";

/**
 * Returns the session format version this recorder writes.
 * Capturing a session arrives in a later task.
 */
export function supportedFormatVersion(): number {
  return version();
}
