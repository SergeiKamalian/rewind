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

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

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
 * with `on` are omitted.
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
  return {
    id: ctx.mirror.getId(node),
    type: "Element",
    tagName: tagName(node),
    attributes: readAttributes(node),
    childNodes: isScript(node) ? [] : serializeChildren(node, ctx),
  };
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

function readAttributes(element: Element): Record<string, string | true> {
  const attributes: Record<string, string | true> = {};
  const { attributes: source } = element;
  for (let index = 0; index < source.length; index += 1) {
    const attribute = source.item(index);
    if (attribute === null || isEventHandlerAttribute(attribute.name)) {
      continue;
    }
    attributes[attribute.name] = serializeAttributeValue(
      attribute.name,
      attribute.value,
    );
  }
  return attributes;
}
