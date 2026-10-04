import type {
  CommentNode,
  DoctypeNode,
  DocumentNode,
  ElementNode,
  SerializedNode,
  TextNode,
} from "@rewind/shared";
import type { Mirror } from "../mirror.js";
import {
  controlValueIsMasked,
  elementIsBlocked,
  isPasswordInput,
  maskText,
  type PrivacyOptions,
  placeholderSize,
  type ResolvedPrivacy,
  resolvePrivacy,
  textIsMasked,
} from "../privacy.js";
import {
  isEventHandlerAttribute,
  serializeAttributeValue,
} from "./boolean-attributes.js";
import { isUrlAttribute, resolveSrcset, resolveUrl } from "./resolve-url.js";
import { cssTextNode, stylesheetText } from "./stylesheet.js";

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * Options for serializing a DOM node into the session format.
 */
export interface SerializeContext {
  /** Id registry for this recording. */
  readonly mirror: Mirror;
  /** Masking and blocking rules. Inputs are masked when this is omitted. */
  readonly privacy?: PrivacyOptions;
}

/**
 * Serializes one DOM node and its children into the session format.
 *
 * Returns `undefined` for node kinds that are not recorded.
 * Ids come from `ctx.mirror`. HTML tag names are lowercase. A `<script>`
 * element is kept, and its children are not. Attribute names that start
 * with `on` are omitted. Relative `src`, `href`, and `srcset` become
 * absolute. SVG elements set `isSVG`. An open shadow root is a child
 * with `isShadowRoot`. A password value is omitted. A masked select
 * has no value and no selected option. Other control values and
 * masked text follow `ctx.privacy`. A blocked element is an empty
 * box that keeps its width and height.
 */
export function serializeNode(
  node: Node,
  ctx: SerializeContext,
): SerializedNode | undefined {
  switch (node.nodeType) {
    case Node.DOCUMENT_NODE:
      return serializeDocument(node as Document, ctx);
    case Node.DOCUMENT_TYPE_NODE:
      return serializeDoctype(node as DocumentType, ctx);
    case Node.ELEMENT_NODE:
      return serializeElement(node as Element, ctx);
    case Node.TEXT_NODE:
      return serializeText(node as Text, ctx);
    case Node.COMMENT_NODE:
      return serializeComment(node as Comment, ctx);
    default:
      return undefined;
  }
}

function serializeDocument(
  node: Document,
  ctx: SerializeContext,
): DocumentNode {
  return {
    id: ctx.mirror.getId(node),
    type: "Document",
    childNodes: serializeChildren(node, ctx),
  };
}

function serializeDoctype(
  node: DocumentType,
  ctx: SerializeContext,
): DoctypeNode {
  return {
    id: ctx.mirror.getId(node),
    type: "Doctype",
    name: node.name,
    publicId: node.publicId,
    systemId: node.systemId,
  };
}

function serializeElement(node: Element, ctx: SerializeContext): ElementNode {
  const privacy = resolvePrivacy(ctx.privacy);
  if (elementIsBlocked(node, privacy)) {
    return serializeBlocked(node, ctx);
  }

  const css = stylesheetText(node);
  if (css !== undefined) {
    const inlined: ElementNode = {
      id: ctx.mirror.getId(node),
      type: "Element",
      tagName: "style",
      attributes: withoutLinkIdentity(readAttributes(node)),
      childNodes: [serializeText(cssTextNode(node, css), ctx)],
    };
    markSvg(inlined, node);
    appendShadowRoot(inlined, node, ctx);
    return inlined;
  }

  const element: ElementNode = {
    id: ctx.mirror.getId(node),
    type: "Element",
    tagName: tagName(node),
    attributes: readAttributes(node),
    childNodes: isScript(node) ? [] : serializeChildren(node, ctx),
  };
  markSvg(element, node);
  appendShadowRoot(element, node, ctx);
  applyFormState(element, node, privacy);
  return element;
}

function serializeBlocked(node: Element, ctx: SerializeContext): ElementNode {
  const size = placeholderSize(node);
  const element: ElementNode = {
    id: ctx.mirror.getId(node),
    type: "Element",
    tagName: tagName(node),
    attributes: { width: size.width, height: size.height },
    childNodes: [],
  };
  markSvg(element, node);
  return element;
}

function serializeText(node: Text, ctx: SerializeContext): TextNode {
  const privacy = resolvePrivacy(ctx.privacy);
  const masked = textIsMasked(node, privacy);
  const textContent = masked ? maskText(node.data) : node.data;
  return {
    id: ctx.mirror.getId(node),
    type: "Text",
    textContent,
  };
}

function serializeComment(node: Comment, ctx: SerializeContext): CommentNode {
  return {
    id: ctx.mirror.getId(node),
    type: "Comment",
    textContent: node.data,
  };
}

function serializeChildren(
  node: Node,
  ctx: SerializeContext,
): SerializedNode[] {
  const children: SerializedNode[] = [];
  const { childNodes } = node;
  for (let index = 0; index < childNodes.length; index += 1) {
    const child = childNodes.item(index);
    if (child === null) {
      continue;
    }
    const serialized = serializeNode(child, ctx);
    if (serialized !== undefined) {
      children.push(serialized);
    }
  }
  return children;
}

function tagName(element: Element): string {
  if (element.namespaceURI === HTML_NAMESPACE) {
    return element.localName;
  }
  return element.tagName;
}

function isScript(element: Element): boolean {
  return element.localName.toLowerCase() === "script";
}

function serializeShadowRoot(
  root: ShadowRoot,
  ctx: SerializeContext,
): ElementNode {
  return {
    id: ctx.mirror.getId(root),
    type: "Element",
    tagName: "shadow-root",
    attributes: {},
    isShadowRoot: true,
    childNodes: serializeChildren(root, ctx),
  };
}

function appendShadowRoot(
  element: ElementNode,
  node: Element,
  ctx: SerializeContext,
): void {
  const shadow = node.shadowRoot;
  if (shadow === null) {
    return;
  }
  element.childNodes.push(serializeShadowRoot(shadow, ctx));
}

function markSvg(element: ElementNode, node: Element): void {
  if (node.namespaceURI === SVG_NAMESPACE) {
    element.isSVG = true;
  }
}

function withoutLinkIdentity(
  attributes: Record<string, string | true>,
): Record<string, string | true> {
  const kept: Record<string, string | true> = {};
  for (const name of Object.keys(attributes)) {
    if (name.toLowerCase() === "href" || name.toLowerCase() === "rel") {
      continue;
    }
    const value = attributes[name];
    if (value !== undefined) {
      kept[name] = value;
    }
  }
  return kept;
}

function readAttributes(element: Element): Record<string, string | true> {
  const attributes: Record<string, string | true> = {};
  const { attributes: source } = element;
  const base = element.baseURI;
  for (let index = 0; index < source.length; index += 1) {
    const attribute = source.item(index);
    if (attribute === null || isEventHandlerAttribute(attribute.name)) {
      continue;
    }
    attributes[attribute.name] = serializeAttribute(attribute, base);
  }
  return attributes;
}

/**
 * Converts one attribute into the session format.
 * Boolean attributes become `true`. Relative `src`, `href`, and `srcset`
 * become absolute against `base`. The caller drops `on*` attributes.
 */
export function serializeAttribute(
  attribute: Attr,
  base: string,
): string | true {
  const stored = serializeAttributeValue(attribute.name, attribute.value);
  if (stored === true || !isUrlAttribute(attribute.localName)) {
    return stored;
  }
  if (attribute.localName.toLowerCase() === "srcset") {
    return resolveSrcset(stored, base);
  }
  return resolveUrl(stored, base);
}

function applyFormState(
  element: ElementNode,
  node: Element,
  privacy: ResolvedPrivacy,
): void {
  const kind = controlKind(node);
  if (kind === undefined) {
    return;
  }
  try {
    if (kind === "input") {
      applyInput(element, node as HTMLInputElement, privacy);
      return;
    }
    if (kind === "textarea") {
      applyTextarea(element, node as HTMLTextAreaElement, privacy);
      return;
    }
    if (kind === "select") {
      applySelect(element, node as HTMLSelectElement, privacy);
      return;
    }
    applyOption(element, node as HTMLOptionElement, privacy);
  } catch {
    // Reading a control's live value can throw on a stand-in element.
    // Keep the attributes already copied so the snapshot still returns.
  }
}

function controlKind(
  node: Element,
): "input" | "textarea" | "select" | "option" | undefined {
  const name = node.localName.toLowerCase();
  if (
    name === "input" ||
    name === "textarea" ||
    name === "select" ||
    name === "option"
  ) {
    return name;
  }
  return undefined;
}

function applyInput(
  element: ElementNode,
  node: HTMLInputElement,
  privacy: ResolvedPrivacy,
): void {
  if (isPasswordInput(node)) {
    delete element.attributes.value;
    element.childNodes = [];
    return;
  }
  const type = node.type.toLowerCase();
  if (type === "checkbox" || type === "radio") {
    if (node.checked) {
      element.attributes.checked = true;
    } else {
      delete element.attributes.checked;
    }
  }
  writeControlValue(element, node.value, controlValueIsMasked(node, privacy));
}

function applyTextarea(
  element: ElementNode,
  node: HTMLTextAreaElement,
  privacy: ResolvedPrivacy,
): void {
  writeControlValue(element, node.value, controlValueIsMasked(node, privacy));
  element.childNodes = [];
}

function applySelect(
  element: ElementNode,
  node: HTMLSelectElement,
  privacy: ResolvedPrivacy,
): void {
  if (controlValueIsMasked(node, privacy)) {
    delete element.attributes.value;
    return;
  }
  writeControlValue(element, node.value, false);
}

function applyOption(
  element: ElementNode,
  node: HTMLOptionElement,
  privacy: ResolvedPrivacy,
): void {
  if (controlValueIsMasked(node, privacy)) {
    delete element.attributes.selected;
    if (typeof element.attributes.value === "string") {
      element.attributes.value = maskText(node.value);
    }
    return;
  }
  if (node.selected) {
    element.attributes.selected = true;
  } else {
    delete element.attributes.selected;
  }
}

function writeControlValue(
  element: ElementNode,
  value: string,
  masked: boolean,
): void {
  if (value === "" && element.attributes.value === undefined) {
    return;
  }
  element.attributes.value = masked ? maskText(value) : value;
}
