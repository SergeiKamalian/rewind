/**
 * Kind of a serialized DOM node.
 * String kinds stay readable in recordings, tests, and logs.
 */
export type SerializedNodeType =
  | "Document"
  | "Doctype"
  | "Element"
  | "Text"
  | "Comment"
  | "CDATA";

interface SerializedNodeBase<T extends SerializedNodeType> {
  /** Stable numeric id for this node within the session. */
  id: number;
  /** Discriminant for the serialized node union. */
  type: T;
}

/**
 * The document root. Children are the doctype and the document element.
 */
export interface DocumentNode extends SerializedNodeBase<"Document"> {
  /** Nodes directly under the document, in tree order. */
  childNodes: SerializedNode[];
}

/**
 * A document type declaration.
 * `publicId` and `systemId` are empty strings when the source doctype
 * omits them, so the shape stays stable.
 */
export interface DoctypeNode extends SerializedNodeBase<"Doctype"> {
  /** Doctype name, for example `html`. */
  name: string;
  /** Public identifier. Empty when absent. */
  publicId: string;
  /** System identifier. Empty when absent. */
  systemId: string;
}

/**
 * An element node.
 * Boolean HTML attributes are stored as `true`. Other attributes keep
 * their string values.
 */
export interface ElementNode extends SerializedNodeBase<"Element"> {
  /** Tag name as serialized from the page. */
  tagName: string;
  /** Attributes. Boolean attributes use `true` instead of a string. */
  attributes: Record<string, string | true>;
  /** Child nodes in tree order. */
  childNodes: SerializedNode[];
  /** Set when the element is in the SVG namespace. */
  isSVG?: boolean;
}

/** A text node. */
export interface TextNode extends SerializedNodeBase<"Text"> {
  /** Text content, including empty text nodes. */
  textContent: string;
}

/** An HTML or XML comment. */
export interface CommentNode extends SerializedNodeBase<"Comment"> {
  /** Comment text, without the `<!--` `-->` delimiters. */
  textContent: string;
}

/** A CDATA section. */
export interface CDATANode extends SerializedNodeBase<"CDATA"> {
  /** Character data, without the CDATA delimiters. */
  textContent: string;
}

/**
 * Any serialized DOM node.
 * Narrow on `type` to read kind-specific fields.
 */
export type SerializedNode =
  | DocumentNode
  | DoctypeNode
  | ElementNode
  | TextNode
  | CommentNode
  | CDATANode;

/**
 * Every serialized node kind, in canonical order.
 * Stubbed empty until the implementation commit fills it.
 */
export const SERIALIZED_NODE_TYPES: readonly SerializedNodeType[] = [];
