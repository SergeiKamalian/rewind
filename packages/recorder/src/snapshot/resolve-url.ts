const URL_ATTRIBUTES: ReadonlySet<string> = new Set(["href", "src", "srcset"]);

/**
 * Whether an attribute with this local name is a URL the snapshot resolves.
 */
export function isUrlAttribute(localName: string): boolean {
  return URL_ATTRIBUTES.has(localName.toLowerCase());
}

/**
 * Resolves `value` against `base`.
 * An empty value or a same-document fragment (`#id`) stays as written.
 * A value that cannot be resolved stays as written.
 */
export function resolveUrl(value: string, base: string): string {
  if (value === "" || value.startsWith("#")) {
    return value;
  }
  try {
    return new URL(value, base).href;
  } catch {
    // Some bases, including `about:blank`, cannot resolve a relative URL.
    // Keep the attribute text so serialization does not throw into the host.
    return value;
  }
}

/**
 * Resolves every candidate URL in a `srcset` value.
 * Descriptors such as `1x` and `400w` stay attached to their URL.
 */
export function resolveSrcset(value: string, base: string): string {
  const candidates: string[] = [];
  const parts = value.split(",");
  for (let index = 0; index < parts.length; index += 1) {
    const trimmed = parts[index]?.trim() ?? "";
    if (trimmed === "") {
      continue;
    }
    const space = trimmed.search(/\s/);
    const url = space === -1 ? trimmed : trimmed.slice(0, space);
    const descriptor = space === -1 ? "" : trimmed.slice(space).trim();
    const resolved = resolveUrl(url, base);
    candidates.push(descriptor === "" ? resolved : `${resolved} ${descriptor}`);
  }
  return candidates.join(", ");
}
