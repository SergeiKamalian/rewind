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
}

/**
 * Serializes one DOM node and its children into the session format.
 *
 * Returns `undefined` for node kinds that are not recorded.
 * Ids come from `ctx.mirror`. HTML tag names are lowercase. A `<script>`
 * element is kept, and its children are not. Attribute names that start
 * with `on` are omitted. Relative `src`, `href`, and `srcset` become
 * absolute. SVG elements set `isSVG`. An open shadow root is a child
 * with `isShadowRoot`.
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
  return element;
}

function serializeText(node: Text, ctx: SerializeContext): TextNode {
  return {
    id: ctx.mirror.getId(node),
    type: "Text",
    textContent: node.data,
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
    attributes[attribute.name] = attributeValue(attribute, base);
  }
  return attributes;
}

function attributeValue(attribute: Attr, base: string): string | true {
  const stored = serializeAttributeValue(attribute.name, attribute.value);
  if (stored === true || !isUrlAttribute(attribute.localName)) {
    return stored;
  }
  if (attribute.localName.toLowerCase() === "srcset") {
    return resolveSrcset(stored, base);
  }
  return resolveUrl(stored, base);
}
