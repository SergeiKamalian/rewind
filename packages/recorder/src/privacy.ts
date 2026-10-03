/**
 * Privacy rules for one recording.
 * `maskAllInputs` defaults to true when omitted.
 */
export interface PrivacyOptions {
  /** Replace input, textarea, and select values with stars. */
  maskAllInputs?: boolean;
  /** Extra CSS selector for elements whose text is masked. */
  maskTextSelector?: string;
  /** Extra CSS selector for elements replaced by a sized placeholder. */
  blockSelector?: string;
}

/**
 * Replaces `value` with stars of the same length.
 */
export function maskText(value: string): string {
  void value;
  throw new Error("not implemented");
}
