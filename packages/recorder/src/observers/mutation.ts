import {
  createEvent,
  type MutationAdd,
  type MutationAttribute,
  type MutationEvent,
  type MutationEventData,
  type MutationRemove,
  type MutationText,
} from "@rewind/shared";
import type { Mirror } from "../mirror.js";
import {
  controlValueIsMasked,
  elementIsBlocked,
  isPasswordInput,
  maskText,
  type ResolvedPrivacy,
  resolvePrivacy,
  textIsMasked,
} from "../privacy.js";
import { isEventHandlerAttribute } from "../snapshot/boolean-attributes.js";
import {
  serializeAttribute,
  serializeNode,
} from "../snapshot/serialize-node.js";
import type { SnapshotContext } from "../snapshot/take-full-snapshot.js";

/**
 * Observer options from the issue.
 * `attributeOldValue` stays off: the event stores the value after the batch.
 */
const OBSERVER_OPTIONS: MutationObserverInit = {
  childList: true,
  attributes: true,
  characterData: true,
  subtree: true,
  attributeOldValue: false,
};

/**
 * A live mutation watch.
 * `stop` disconnects it from the document.
 */
export interface MutationObservation {
  /** Disconnects the observer. Later DOM changes are not recorded. */
  stop(): void;
}

/**
 * Observes `document` and emits one `mutation` event per observer callback.
 *
 * The callback is resolved as removes, then adds, then attributes, then
 * text. An added node is serialized with {@link serializeNode} on `ctx`.
 * `stop` disconnects the observer. A failure is reported and does not
 * escape into the host page.
 */
export function observeMutations(
  document: Document,
  ctx: SnapshotContext,
  emit: (event: MutationEvent) => void,
): MutationObservation {
  const Owner = document.defaultView?.MutationObserver;
  if (Owner === undefined) {
    reportFailure(new Error("document has no MutationObserver"));
    return { stop() {} };
  }

  const observer = new Owner((records) => {
    try {
      const data = toMutationData(records, ctx);
      if (!hasChanges(data)) {
        return;
      }
      emit(createEvent("mutation", data, ctx.clock));
    } catch (error) {
      reportFailure(error);
    }
  });

  try {
    observer.observe(document, OBSERVER_OPTIONS);
  } catch (error) {
    reportFailure(error);
    return { stop() {} };
  }

  return {
    stop() {
      try {
        observer.disconnect();
      } catch (error) {
        reportFailure(error);
      }
    },
  };
}

interface Batch {
  /** First parent a node was removed from in this callback. */
  readonly removedParents: Map<Node, Node>;
  /** Nodes that appear in some `addedNodes` list. */
  readonly added: Set<Node>;
  /** Added nodes in the order they were first seen. */
  readonly addedOrder: Node[];
  readonly attributeRecords: MutationRecord[];
  readonly textRecords: MutationRecord[];
}

function toMutationData(
  records: MutationRecord[],
  ctx: SnapshotContext,
): MutationEventData {
  const batch = groupRecords(records);
  const removes = batchRemoves(batch, ctx.mirror);
  const { adds, roots } = batchAdds(batch, ctx);
  const attributes = batchAttributes(batch.attributeRecords, ctx, roots);
  const texts = batchTexts(batch.textRecords, ctx, roots);
  return { adds, removes, attributes, texts };
}

function groupRecords(records: MutationRecord[]): Batch {
  const removedParents = new Map<Node, Node>();
  const added = new Set<Node>();
  const addedOrder: Node[] = [];
  const attributeRecords: MutationRecord[] = [];
  const textRecords: MutationRecord[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record === undefined) {
      continue;
    }
    if (record.type === "childList") {
      collectChildList(record, removedParents, added, addedOrder);
    } else if (record.type === "attributes") {
      attributeRecords.push(record);
    } else if (record.type === "characterData") {
      textRecords.push(record);
    }
  }

  return {
    removedParents,
    added,
    addedOrder,
    attributeRecords,
    textRecords,
  };
}

function collectChildList(
  record: MutationRecord,
  removedParents: Map<Node, Node>,
  added: Set<Node>,
  addedOrder: Node[],
): void {
  const { removedNodes, addedNodes } = record;
  for (let index = 0; index < removedNodes.length; index += 1) {
    const node = removedNodes[index];
    if (node !== undefined && !removedParents.has(node)) {
      removedParents.set(node, record.target);
    }
  }
  for (let index = 0; index < addedNodes.length; index += 1) {
    const node = addedNodes[index];
    if (node === undefined || added.has(node)) {
      continue;
    }
    added.add(node);
    addedOrder.push(node);
  }
}

function batchRemoves(batch: Batch, mirror: Mirror): MutationRemove[] {
  const removes: MutationRemove[] = [];
  for (const [node, parent] of batch.removedParents) {
    if (!mirror.has(node) || !mirror.has(parent)) {
      continue;
    }
    removes.push({
      parentId: mirror.getId(parent),
      id: mirror.getId(node),
    });
  }
  return removes;
}

function batchAdds(
  batch: Batch,
  ctx: SnapshotContext,
): { adds: MutationAdd[]; roots: Set<Node> } {
  const adds: MutationAdd[] = [];
  const roots = new Set<Node>();
  const seen = new Set<Node>();
  const privacy = resolvePrivacy(ctx.privacy);

  const pending: Node[] = [];
  for (let index = 0; index < batch.addedOrder.length; index += 1) {
    const node = batch.addedOrder[index];
    if (node === undefined || seen.has(node)) {
      continue;
    }
    seen.add(node);
    if (!emitAdd(node, batch.added, privacy)) {
      continue;
    }
    pending.push(node);
  }

  // Later nodes first. An earlier sibling's nextId is often a node added
  // in this same batch, and the player inserts before nextId.
  pending.sort(laterNodeFirst);

  for (let index = 0; index < pending.length; index += 1) {
    const node = pending[index];
    if (node === undefined) {
      continue;
    }
    const serialized = serializeNode(node, ctx);
    const parent = node.parentNode;
    if (serialized === undefined || parent === null) {
      continue;
    }
    roots.add(node);
    adds.push({
      parentId: ctx.mirror.getId(parent),
      nextId: siblingId(node.nextSibling, ctx.mirror),
      node: serialized,
    });
  }

  return { adds, roots };
}

/**
 * Sort key so a node comes before a sibling that inserts in front of it.
 * `compareDocumentPosition` is only used for nodes still in the document.
 */
function laterNodeFirst(left: Node, right: Node): number {
  if (left === right) {
    return 0;
  }
  const position = left.compareDocumentPosition(right);
  if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
    return 1;
  }
  if ((position & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
    return -1;
  }
  return 0;
}

function emitAdd(
  node: Node,
  added: Set<Node>,
  privacy: ResolvedPrivacy,
): boolean {
  if (!node.isConnected || hasAddedAncestor(node, added)) {
    return false;
  }
  if (insideScript(node)) {
    return false;
  }
  // The node itself may be a newly blocked element. serializeNode
  // records that as a placeholder. Only an already blocked ancestor
  // drops the add, so a secret inserted into it is not recorded.
  const parent = ancestor(node);
  return parent === null || !insideBlocked(parent, privacy);
}

function batchAttributes(
  records: MutationRecord[],
  ctx: SnapshotContext,
  roots: Set<Node>,
): MutationAttribute[] {
  const attributes: MutationAttribute[] = [];
  const indexByKey = new Map<string, number>();
  const privacy = resolvePrivacy(ctx.privacy);

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record === undefined) {
      continue;
    }
    const change = attributeChange(record, ctx, roots, privacy);
    if (change === undefined) {
      continue;
    }
    const key = `${change.id}\0${change.name}`;
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, attributes.length);
      attributes.push(change);
    } else {
      attributes[existing] = change;
    }
  }

  return attributes;
}

function attributeChange(
  record: MutationRecord,
  ctx: SnapshotContext,
  roots: Set<Node>,
  privacy: ResolvedPrivacy,
): MutationAttribute | undefined {
  const { target } = record;
  const name = record.attributeName;
  if (target.nodeType !== Node.ELEMENT_NODE || name === null) {
    return undefined;
  }
  if (isEventHandlerAttribute(name) || !target.isConnected) {
    return undefined;
  }
  if (coveredByAdd(target, roots) || !ctx.mirror.has(target)) {
    return undefined;
  }
  const element = target as Element;
  const value = privacyAttribute(element, name, privacy);
  if (value === undefined) {
    return undefined;
  }
  return { id: ctx.mirror.getId(element), name, value };
}

function privacyAttribute(
  element: Element,
  name: string,
  privacy: ResolvedPrivacy,
): string | true | null | undefined {
  if (elementIsBlocked(element, privacy) || insideBlocked(element, privacy)) {
    return undefined;
  }
  const normalized = name.toLowerCase();
  if (isPasswordInput(element) && normalized === "value") {
    return undefined;
  }
  const kind = controlKind(element);
  if (kind !== undefined && controlValueIsMasked(element, privacy)) {
    if (kind === "select" && normalized === "value") {
      return undefined;
    }
    if (kind === "option" && normalized === "selected") {
      return undefined;
    }
    if (
      normalized === "value" &&
      (kind === "input" || kind === "textarea" || kind === "option")
    ) {
      return maskedValue(element, name);
    }
  }
  return liveAttribute(element, name);
}

function maskedValue(element: Element, name: string): string | null {
  const raw = element.getAttribute(name);
  if (raw === null) {
    return null;
  }
  return maskText(raw);
}

function liveAttribute(element: Element, name: string): string | true | null {
  const attribute = element.getAttributeNode(name);
  if (attribute === null) {
    return null;
  }
  return serializeAttribute(attribute, element.baseURI);
}

function batchTexts(
  records: MutationRecord[],
  ctx: SnapshotContext,
  roots: Set<Node>,
): MutationText[] {
  const texts: MutationText[] = [];
  const indexById = new Map<number, number>();
  const privacy = resolvePrivacy(ctx.privacy);

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record === undefined) {
      continue;
    }
    const change = textChange(record, ctx, roots, privacy);
    if (change === undefined) {
      continue;
    }
    const existing = indexById.get(change.id);
    if (existing === undefined) {
      indexById.set(change.id, texts.length);
      texts.push(change);
    } else {
      texts[existing] = change;
    }
  }

  return texts;
}

function textChange(
  record: MutationRecord,
  ctx: SnapshotContext,
  roots: Set<Node>,
  privacy: ResolvedPrivacy,
): MutationText | undefined {
  const data = characterData(record.target);
  if (data === undefined || !data.isConnected || !ctx.mirror.has(data)) {
    return undefined;
  }
  if (
    coveredByAdd(data, roots) ||
    insideBlocked(data, privacy) ||
    insideScript(data)
  ) {
    return undefined;
  }
  return { id: ctx.mirror.getId(data), value: recordedText(data, privacy) };
}

function recordedText(node: CharacterData, privacy: ResolvedPrivacy): string {
  if (node.nodeType !== Node.TEXT_NODE) {
    return node.data;
  }
  return textIsMasked(node, privacy) ? maskText(node.data) : node.data;
}

function characterData(node: Node): CharacterData | undefined {
  if (
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.COMMENT_NODE ||
    node.nodeType === Node.CDATA_SECTION_NODE
  ) {
    return node as CharacterData;
  }
  return undefined;
}

function controlKind(
  element: Element,
): "input" | "textarea" | "select" | "option" | undefined {
  const name = element.localName.toLowerCase();
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

function coveredByAdd(node: Node, roots: Set<Node>): boolean {
  let current: Node | null = node;
  while (current !== null) {
    if (roots.has(current)) {
      return true;
    }
    current = ancestor(current);
  }
  return false;
}

function hasAddedAncestor(node: Node, added: Set<Node>): boolean {
  let current = ancestor(node);
  while (current !== null) {
    if (added.has(current)) {
      return true;
    }
    current = ancestor(current);
  }
  return false;
}

function insideBlocked(node: Node, privacy: ResolvedPrivacy): boolean {
  let current: Node | null = node;
  while (current !== null) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      elementIsBlocked(current as Element, privacy)
    ) {
      return true;
    }
    current = ancestor(current);
  }
  return false;
}

function insideScript(node: Node): boolean {
  let current = ancestor(node);
  while (current !== null) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      (current as Element).localName.toLowerCase() === "script"
    ) {
      return true;
    }
    current = ancestor(current);
  }
  return false;
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

function siblingId(next: Node | null, mirror: Mirror): number | null {
  if (next === null) {
    return null;
  }
  return mirror.getId(next);
}

function hasChanges(data: MutationEventData): boolean {
  return (
    data.adds.length > 0 ||
    data.removes.length > 0 ||
    data.attributes.length > 0 ||
    data.texts.length > 0
  );
}

function reportFailure(error: unknown): void {
  console.error("[rewind] mutation observer failed", error);
}
