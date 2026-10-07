import type {
  MutationEventData,
  RewindEvent,
  SerializedNode,
} from "@rewind/shared";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * Rebuilds a document from a full snapshot and the mutations after it.
 *
 * Each mutation is applied as removes, then adds, then attributes, then
 * text. An add is inserted under `parentId`, before `nextId` (`null`
 * appends). The result is a new document, built only from the recording.
 * Test-only: the recorder package does not export this function.
 */
export function rebuild(events: readonly RewindEvent[]): Document {
  const ordered = [...events].sort((left, right) => left.seq - right.seq);
  const snapshot = ordered.find((event) => event.type === "full_snapshot");
  if (snapshot === undefined || snapshot.type !== "full_snapshot") {
    throw new Error("rebuild requires a full_snapshot");
  }

  const doc = document.implementation.createHTMLDocument("");
  clearChildren(doc);
  const ids = new Map<number, Node>();
  ids.set(snapshot.data.node.id, doc);
  const children = snapshot.data.node.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child !== undefined) {
      doc.append(materialize(child, doc, ids));
    }
  }

  for (let index = 0; index < ordered.length; index += 1) {
    const event = ordered[index];
    if (event === undefined || event.type !== "mutation") {
      continue;
    }
    if (event.seq <= snapshot.seq) {
      continue;
    }
    applyMutation(event.data, doc, ids);
  }
  return doc;
}

function applyMutation(
  data: MutationEventData,
  doc: Document,
  ids: Map<number, Node>,
): void {
  const { removes, adds, attributes, texts } = data;
  for (let index = 0; index < removes.length; index += 1) {
    const remove = removes[index];
    if (remove === undefined) {
      continue;
    }
    const node = requireNode(ids, remove.id);
    const parent = node.parentNode;
    if (parent !== null) {
      parent.removeChild(node);
    }
  }

  for (let index = 0; index < adds.length; index += 1) {
    const add = adds[index];
    if (add === undefined) {
      continue;
    }
    const parent = requireNode(ids, add.parentId);
    const node = materialize(add.node, doc, ids);
    const next = add.nextId === null ? null : requireNode(ids, add.nextId);
    parent.insertBefore(node, next);
  }

  for (let index = 0; index < attributes.length; index += 1) {
    const attribute = attributes[index];
    if (attribute === undefined) {
      continue;
    }
    const node = requireNode(ids, attribute.id);
    if (!(node instanceof Element)) {
      throw new Error(`attribute target ${attribute.id} is not an element`);
    }
    if (attribute.value === null) {
      node.removeAttribute(attribute.name);
    } else {
      node.setAttribute(attribute.name, attributeValue(attribute.value));
    }
  }

  for (let index = 0; index < texts.length; index += 1) {
    const text = texts[index];
    if (text === undefined) {
      continue;
    }
    const node = requireNode(ids, text.id);
    if (!isCharacterData(node)) {
      throw new Error(`text target ${text.id} is not character data`);
    }
    node.data = text.value;
  }
}

function materialize(
  node: SerializedNode,
  doc: Document,
  ids: Map<number, Node>,
): Node {
  switch (node.type) {
    case "Document":
      throw new Error("a document cannot be inserted");
    case "Doctype": {
      const doctype = doc.implementation.createDocumentType(
        node.name,
        node.publicId,
        node.systemId,
      );
      ids.set(node.id, doctype);
      return doctype;
    }
    case "Element": {
      const element = node.isSVG
        ? doc.createElementNS(SVG_NAMESPACE, node.tagName)
        : doc.createElement(node.tagName);
      ids.set(node.id, element);
      writeAttributes(element, node.attributes);
      appendChildren(element, node.childNodes, doc, ids);
      return element;
    }
    case "Text": {
      const text = doc.createTextNode(node.textContent);
      ids.set(node.id, text);
      return text;
    }
    case "Comment": {
      const comment = doc.createComment(node.textContent);
      ids.set(node.id, comment);
      return comment;
    }
    case "CDATA": {
      const cdata = doc.createCDATASection(node.textContent);
      ids.set(node.id, cdata);
      return cdata;
    }
    default: {
      const unexpected: never = node;
      throw new Error(`unknown node ${String(unexpected)}`);
    }
  }
}

function appendChildren(
  parent: Element,
  children: readonly SerializedNode[],
  doc: Document,
  ids: Map<number, Node>,
): void {
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child === undefined) {
      continue;
    }
    if (child.type === "Element" && child.isShadowRoot === true) {
      const shadow = parent.attachShadow({ mode: "open" });
      ids.set(child.id, shadow);
      const nested = child.childNodes;
      for (let inner = 0; inner < nested.length; inner += 1) {
        const node = nested[inner];
        if (node !== undefined) {
          shadow.append(materialize(node, doc, ids));
        }
      }
      continue;
    }
    parent.append(materialize(child, doc, ids));
  }
}

function writeAttributes(
  element: Element,
  attributes: Record<string, string | true>,
): void {
  const names = Object.keys(attributes);
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (name === undefined) {
      continue;
    }
    const value = attributes[name];
    if (value === undefined) {
      continue;
    }
    element.setAttribute(name, attributeValue(value));
  }
}

/**
 * A recorded boolean attribute is `true`. The DOM stores that as present
 * with an empty value, which matches `getAttribute` on the live element.
 */
function attributeValue(value: string | true): string {
  return value === true ? "" : value;
}

function requireNode(ids: Map<number, Node>, id: number): Node {
  const node = ids.get(id);
  if (node === undefined) {
    throw new Error(`missing node ${id}`);
  }
  return node;
}

function isCharacterData(node: Node): node is CharacterData {
  return (
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.COMMENT_NODE ||
    node.nodeType === Node.CDATA_SECTION_NODE
  );
}

function clearChildren(node: Node): void {
  while (node.childNodes.length > 0) {
    const child = node.childNodes.item(0);
    if (child === null) {
      return;
    }
    node.removeChild(child);
  }
}
