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
import { maskText, resolvePrivacy, textIsMasked } from "../privacy.js";
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
 * Adds, removes, attribute changes, and text changes from that callback
 * share one event. An added node is serialized with {@link serializeNode}
 * on `ctx`, so it uses the same mirror and privacy rules as the snapshot.
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

function toMutationData(
  records: MutationRecord[],
  ctx: SnapshotContext,
): MutationEventData {
  const adds: MutationAdd[] = [];
  const removes: MutationRemove[] = [];
  const attributes: MutationAttribute[] = [];
  const texts: MutationText[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record === undefined) {
      continue;
    }
    if (record.type === "childList") {
      collectRemoves(record, ctx.mirror, removes);
      collectAdds(record, ctx, adds);
    } else if (record.type === "attributes") {
      collectAttribute(record, ctx, attributes);
    } else if (record.type === "characterData") {
      collectText(record, ctx, texts);
    }
  }

  return { adds, removes, attributes, texts };
}

function collectRemoves(
  record: MutationRecord,
  mirror: Mirror,
  removes: MutationRemove[],
): void {
  const parent = record.target;
  if (!mirror.has(parent)) {
    return;
  }
  const parentId = mirror.getId(parent);
  const { removedNodes } = record;
  for (let index = 0; index < removedNodes.length; index += 1) {
    const node = removedNodes[index];
    if (node === undefined || !mirror.has(node)) {
      continue;
    }
    removes.push({ parentId, id: mirror.getId(node) });
  }
}

function collectAdds(
  record: MutationRecord,
  ctx: SnapshotContext,
  adds: MutationAdd[],
): void {
  const parentId = ctx.mirror.getId(record.target);
  const { addedNodes } = record;
  for (let index = 0; index < addedNodes.length; index += 1) {
    const node = addedNodes[index];
    if (node === undefined) {
      continue;
    }
    const serialized = serializeNode(node, ctx);
    if (serialized === undefined) {
      continue;
    }
    adds.push({
      parentId,
      nextId: siblingId(node.nextSibling, ctx.mirror),
      node: serialized,
    });
  }
}

function siblingId(next: Node | null, mirror: Mirror): number | null {
  if (next === null) {
    return null;
  }
  return mirror.getId(next);
}

function collectAttribute(
  record: MutationRecord,
  ctx: SnapshotContext,
  attributes: MutationAttribute[],
): void {
  const { target } = record;
  const name = record.attributeName;
  if (target.nodeType !== Node.ELEMENT_NODE || name === null) {
    return;
  }
  if (isEventHandlerAttribute(name) || !ctx.mirror.has(target)) {
    return;
  }
  const element = target as Element;
  attributes.push({
    id: ctx.mirror.getId(element),
    name,
    value: attributeValue(element, name),
  });
}

function attributeValue(element: Element, name: string): string | true | null {
  const attribute = element.getAttributeNode(name);
  if (attribute === null) {
    return null;
  }
  return serializeAttribute(attribute, element.baseURI);
}

function collectText(
  record: MutationRecord,
  ctx: SnapshotContext,
  texts: MutationText[],
): void {
  const data = characterData(record.target);
  if (data === undefined || !ctx.mirror.has(data)) {
    return;
  }
  texts.push({
    id: ctx.mirror.getId(data),
    value: recordedText(data, ctx),
  });
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

function recordedText(node: CharacterData, ctx: SnapshotContext): string {
  if (node.nodeType !== Node.TEXT_NODE) {
    return node.data;
  }
  const privacy = resolvePrivacy(ctx.privacy);
  return textIsMasked(node, privacy) ? maskText(node.data) : node.data;
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
