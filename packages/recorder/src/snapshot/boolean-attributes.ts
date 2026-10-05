/**
 * HTML boolean attributes.
 * Presence is the value. `hidden` is included because its empty form is
 * boolean; `hidden="until-found"` is kept as a string by the writer below.
 */
const BOOLEAN_ATTRIBUTES: ReadonlySet<string> = new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "disablepictureinpicture",
  "disableremoteplayback",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
  "shadowrootclonable",
  "shadowrootdelegatesfocus",
  "shadowrootserializable",
]);

/**
 * Converts one attribute value into the session format.
 * A boolean attribute whose value is empty or the attribute name becomes
 * `true`. Every other value stays a string.
 */
export function serializeAttributeValue(
  name: string,
  value: string,
): string | true {
  const normalized = name.toLowerCase();
  if (!BOOLEAN_ATTRIBUTES.has(normalized)) {
    return value;
  }
  if (value === "" || value.toLowerCase() === normalized) {
    return true;
  }
  return value;
}

/**
 * Whether `name` is an inline event handler (`onclick`, `ONCLICK`, …).
 */
export function isEventHandlerAttribute(name: string): boolean {
  return name.toLowerCase().startsWith("on");
}
