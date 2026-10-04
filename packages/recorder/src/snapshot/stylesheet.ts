import { resolveUrl } from "./resolve-url.js";

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

/**
 * Text nodes created for inlined CSS.
 * Keyed by the link element so a second snapshot of the same link
 * reuses the id.
 */
const inlinedCssText = new WeakMap<Element, Text>();

/**
 * CSS text for a same-origin `<link rel="stylesheet">`, when the document
 * exposes the rules. Returns `undefined` when the link should be kept.
 */
export function stylesheetText(link: Element): string | undefined {
  if (!isStylesheetLink(link)) {
    return undefined;
  }
  const doc = link.ownerDocument;
  if (doc === null) {
    return undefined;
  }
  const href = absoluteHref(link);
  const sheets = doc.styleSheets;
  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = itemAt(sheets, index);
    if (sheet === null || !sheetMatches(sheet, link, href)) {
      continue;
    }
    return ruleText(sheet, cssBase(sheet, href));
  }
  return undefined;
}

/**
 * Returns a stable text node holding `css` for this link.
 */
export function cssTextNode(link: Element, css: string): Text {
  const existing = inlinedCssText.get(link);
  if (existing !== undefined) {
    existing.data = css;
    return existing;
  }
  const text = link.ownerDocument.createTextNode(css);
  inlinedCssText.set(link, text);
  return text;
}

function isStylesheetLink(element: Element): boolean {
  if (element.namespaceURI !== HTML_NAMESPACE || element.localName !== "link") {
    return false;
  }
  const rel = element.getAttribute("rel");
  if (rel === null) {
    return false;
  }
  const tokens = rel.toLowerCase().split(/\s+/);
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === "stylesheet") {
      return true;
    }
  }
  return false;
}

function absoluteHref(link: Element): string | undefined {
  const raw = link.getAttribute("href");
  if (raw === null || raw === "") {
    return undefined;
  }
  return resolveUrl(raw, link.baseURI);
}

function sheetMatches(
  sheet: StyleSheet,
  link: Element,
  href: string | undefined,
): boolean {
  if (sheet.ownerNode === link) {
    return true;
  }
  if (sheet.ownerNode !== null) {
    return false;
  }
  return href !== undefined && sheet.href === href;
}

function cssBase(
  sheet: StyleSheet,
  linkHref: string | undefined,
): string | undefined {
  if (sheet.href !== null && sheet.href !== "") {
    return sheet.href;
  }
  return linkHref;
}

function ruleText(
  sheet: StyleSheet,
  base: string | undefined,
): string | undefined {
  try {
    const rules = (sheet as CSSStyleSheet).cssRules;
    const parts: string[] = [];
    for (let index = 0; index < rules.length; index += 1) {
      const rule = itemAt(rules, index);
      if (rule === null) {
        continue;
      }
      const text = rule.cssText;
      parts.push(
        base === undefined || base === "" ? text : resolveCssUrls(text, base),
      );
    }
    return parts.join("\n");
  } catch {
    // Cross-origin sheets throw when script reads cssRules.
    // The link stays in the snapshot instead.
    return undefined;
  }
}

/**
 * Rewrites relative `url()` and `@import` paths in `css` against `base`.
 * `data:` URLs, other absolute URLs, and `url(#id)` stay as written.
 * A value that cannot be resolved stays as written.
 */
function resolveCssUrls(css: string, base: string): string {
  const withFunctions = css.replace(
    /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (match, quote: string, url: string) => {
      const resolved = rewriteCssUrl(url, base);
      if (resolved === url) {
        return match;
      }
      return `url(${quote}${resolved}${quote})`;
    },
  );
  return withFunctions.replace(
    /@import\s+(['"])(.*?)\1/gi,
    (match, quote: string, url: string) => {
      const resolved = rewriteCssUrl(url, base);
      if (resolved === url) {
        return match;
      }
      return `@import ${quote}${resolved}${quote}`;
    },
  );
}

function rewriteCssUrl(url: string, base: string): string {
  if (url === "" || url.startsWith("#") || hasScheme(url)) {
    return url;
  }
  return resolveUrl(url, base);
}

function hasScheme(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url);
}

/**
 * Reads one entry from a DOM list.
 * happy-dom's `styleSheets` is a plain array and has no `item` method.
 */
function itemAt<T>(
  list: ArrayLike<T> & { item?: (index: number) => T | null },
  index: number,
): T | null {
  if (typeof list.item === "function") {
    return list.item(index);
  }
  return list[index] ?? null;
}
