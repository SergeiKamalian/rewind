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

/** Privacy options with `maskAllInputs` filled in. */
export interface ResolvedPrivacy {
  /** When true, control values are stars. Passwords are always omitted. */
  readonly maskAllInputs: boolean;
  /** Extra CSS selector for elements whose text is masked. */
  readonly maskTextSelector?: string;
  /** Extra CSS selector for elements replaced by a sized placeholder. */
  readonly blockSelector?: string;
}

/**
 * Fills in the default masking rules.
 * Omitted options mean `maskAllInputs` is on.
 */
export function resolvePrivacy(
  options: PrivacyOptions | undefined,
): ResolvedPrivacy {
  const maskAllInputs = options?.maskAllInputs ?? true;
  const maskTextSelector = options?.maskTextSelector;
  const blockSelector = options?.blockSelector;
  if (maskTextSelector !== undefined && blockSelector !== undefined) {
    return { maskAllInputs, maskTextSelector, blockSelector };
  }
  if (maskTextSelector !== undefined) {
    return { maskAllInputs, maskTextSelector };
  }
  if (blockSelector !== undefined) {
    return { maskAllInputs, blockSelector };
  }
  return { maskAllInputs };
}

/**
 * Replaces `value` with stars of the same length.
 */
export function maskText(value: string): string {
  return "*".repeat(value.length);
}

/**
 * Whether this element is replaced by an empty sized placeholder.
 */
export function elementIsBlocked(
  element: Element,
  privacy: ResolvedPrivacy,
): boolean {
  if (element.hasAttribute("data-rewind-block")) {
    return true;
  }
  return matchesSelector(element, privacy.blockSelector);
}

/**
 * Whether text in this node is replaced with stars.
 * A node is masked when it, or an ancestor, is marked for masking.
 * An open shadow root continues the walk at its host.
 */
export function textIsMasked(node: Node, privacy: ResolvedPrivacy): boolean {
  let current: Node | null = node;
  while (current !== null) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      elementMasksText(current as Element, privacy)
    ) {
      return true;
    }
    current = ancestor(current);
  }
  return false;
}

/**
 * Whether this element is an `input` whose type is `password`.
 */
export function isPasswordInput(element: Element): boolean {
  if (element.localName.toLowerCase() !== "input") {
    return false;
  }
  try {
    const property = (element as HTMLInputElement).type;
    if (typeof property === "string" && property.toLowerCase() === "password") {
      return true;
    }
  } catch {
    // A stand-in element can throw when its type is read.
    // The attribute below is the fallback.
  }
  const attribute = element.getAttribute("type");
  return attribute !== null && attribute.toLowerCase() === "password";
}

/**
 * Whether a control value is stored as stars.
 * Passwords are omitted by the caller and are not starred here.
 */
export function controlValueIsMasked(
  element: Element,
  privacy: ResolvedPrivacy,
): boolean {
  if (privacy.maskAllInputs) {
    return true;
  }
  return textIsMasked(element, privacy);
}

/**
 * Width and height for a blocked placeholder.
 * Uses the layout box when it is non-zero, then computed style,
 * then the `width` and `height` attributes, then `0px`.
 */
export function placeholderSize(element: Element): {
  width: string;
  height: string;
} {
  return {
    width: boxAxis(element, "width"),
    height: boxAxis(element, "height"),
  };
}

function elementMasksText(element: Element, privacy: ResolvedPrivacy): boolean {
  if (element.hasAttribute("data-rewind-mask")) {
    return true;
  }
  if (element.classList.contains("rewind-mask")) {
    return true;
  }
  return matchesSelector(element, privacy.maskTextSelector);
}

function ancestor(node: Node): Node | null {
  const parent = node.parentNode;
  if (parent === null) {
    return null;
  }
  if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in parent) {
    return (parent as ShadowRoot).host;
  }
  return parent;
}

function matchesSelector(
  element: Element,
  selector: string | undefined,
): boolean {
  if (selector === undefined || selector.trim() === "") {
    return false;
  }
  try {
    return element.matches(selector);
  } catch {
    // A bad selector is a host configuration mistake.
    // Skip it so serialization does not throw into the page.
    return false;
  }
}

function boxAxis(element: Element, axis: "width" | "height"): string {
  return (
    layoutLength(element, axis) ??
    computedLength(element, axis) ??
    attributeLength(element, axis) ??
    "0px"
  );
}

function layoutLength(
  element: Element,
  axis: "width" | "height",
): string | undefined {
  try {
    const rect = element.getBoundingClientRect();
    const size = axis === "width" ? rect.width : rect.height;
    if (size > 0) {
      return `${size}px`;
    }
  } catch {
    // A detached or cross-realm node can throw.
    // Computed style and attributes are the fallback.
  }
  return undefined;
}

function computedLength(
  element: Element,
  axis: "width" | "height",
): string | undefined {
  try {
    const value = getComputedStyle(element)[axis];
    if (value === "" || value === "auto") {
      return undefined;
    }
    return value;
  } catch {
    // getComputedStyle throws when the element has no window.
    return undefined;
  }
}

function attributeLength(
  element: Element,
  axis: "width" | "height",
): string | undefined {
  const value = element.getAttribute(axis);
  if (value === null || value === "") {
    return undefined;
  }
  return value;
}
