import { version } from "@rewind/shared";
import type { ReactElement } from "react";

/**
 * Root of the replay player.
 * The timeline and inspection panels arrive in week 2.
 */
export function Player(): ReactElement {
  return <div data-rewind-player="" data-format-version={version()} />;
}
