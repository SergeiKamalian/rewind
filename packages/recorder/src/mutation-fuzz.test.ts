import type { RewindEvent } from "@rewind/shared";
import { afterEach, describe, expect, it } from "vitest";
import { rebuild } from "../test-utils/rebuild.js";
import { Mirror } from "./mirror.js";
import { observeMutations } from "./observers/mutation.js";
import {
  type SnapshotContext,
  takeFullSnapshot,
} from "./snapshot/take-full-snapshot.js";

const OPERATIONS = 200;
const SEEDS = [1, 7, 42, 99, 256] as const;

const TAGS = [
  "div",
  "span",
  "p",
  "section",
  "em",
  "strong",
  "article",
] as const;
const ATTRIBUTES = ["class", "title", "data-k", "role"] as const;
const ALPHABET = "abcdefghij";

/**
 * Delivers the queued MutationObserver callback.
 * happy-dom runs it as a microtask, so this does not use a timer.
 */
function flushMutations(): Promise<void> {
  return Promise.resolve();
}

/**
 * Mulberry32. One seed always yields the same stream.
 * Values are in [0, 1). This test does not call `Math.random`.
 */
function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) {
    throw new Error("empty choice");
  }
  return item;
}

function token(rng: () => number): string {
  const length = 1 + Math.floor(rng() * 6);
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return value;
}

function listAttributes(element: Element): Attr[] {
  const attributes: Attr[] = [];
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute !== null) {
      attributes.push(attribute);
    }
  }
  return attributes;
}

function listNodes<T extends Node>(list: NodeListOf<T>): T[] {
  const nodes: T[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const node = list.item(index);
    if (node !== null) {
      nodes.push(node);
    }
  }
  return nodes;
}

function elements(): Element[] {
  return listNodes(document.body.querySelectorAll("*"));
}

function textNodes(): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current !== null) {
    if (current.nodeType === Node.TEXT_NODE) {
      nodes.push(current as Text);
    }
    current = walker.nextNode();
  }
  return nodes;
}

function parentsOf(pool: readonly Element[]): Element[] {
  return [document.body, ...pool];
}

function makeElement(rng: () => number): HTMLElement {
  const element = document.createElement(pick(rng, TAGS));
  if (rng() < 0.7) {
    element.textContent = token(rng);
  }
  if (rng() < 0.5) {
    element.setAttribute(pick(rng, ATTRIBUTES), token(rng));
  }
  return element;
}

function appendElement(rng: () => number): void {
  const parent = pick(rng, parentsOf(elements()));
  parent.append(makeElement(rng));
}

function insertBeforeElement(rng: () => number): void {
  const parent = pick(rng, parentsOf(elements()));
  const element = makeElement(rng);
  const children = listNodes(parent.childNodes);
  if (children.length === 0) {
    parent.append(element);
    return;
  }
  parent.insertBefore(element, pick(rng, children));
}

function removeElement(rng: () => number): void {
  const pool = elements();
  if (pool.length === 0) {
    appendElement(rng);
    return;
  }
  pick(rng, pool).remove();
}

function moveElement(rng: () => number): void {
  const pool = elements();
  if (pool.length === 0) {
    appendElement(rng);
    return;
  }
  const node = pick(rng, pool);
  const parents = parentsOf(pool).filter(
    (parent) => parent !== node && !node.contains(parent),
  );
  if (parents.length === 0) {
    appendElement(rng);
    return;
  }
  const parent = pick(rng, parents);
  const children = listNodes(parent.childNodes).filter(
    (child) => child !== node,
  );
  if (children.length > 0 && rng() < 0.5) {
    parent.insertBefore(node, pick(rng, children));
    return;
  }
  parent.append(node);
}

/**
 * Adds a parent, then a child, then a grandchild while connected,
 * so one callback sees a nested add.
 */
function nestedAdd(rng: () => number): void {
  const host = pick(rng, parentsOf(elements()));
  const parent = document.createElement(pick(rng, TAGS));
  host.append(parent);
  const child = document.createElement(pick(rng, TAGS));
  child.textContent = token(rng);
  parent.append(child);
  const grandchild = document.createElement(pick(rng, TAGS));
  grandchild.textContent = token(rng);
  child.append(grandchild);
}

function setAttribute(rng: () => number): void {
  const pool = elements();
  if (pool.length === 0) {
    appendElement(rng);
    return;
  }
  pick(rng, pool).setAttribute(pick(rng, ATTRIBUTES), token(rng));
}

function removeAttribute(rng: () => number): void {
  const pool = elements();
  if (pool.length === 0) {
    appendElement(rng);
    return;
  }
  pick(rng, pool).removeAttribute(pick(rng, ATTRIBUTES));
}

function changeText(rng: () => number): void {
  const texts = textNodes();
  if (texts.length === 0) {
    const pool = elements();
    if (pool.length === 0) {
      appendElement(rng);
      return;
    }
    pick(rng, pool).append(document.createTextNode(token(rng)));
    return;
  }
  pick(rng, texts).data = token(rng);
}

const OPERATIONS_BY_KIND = [
  appendElement,
  insertBeforeElement,
  removeElement,
  moveElement,
  nestedAdd,
  setAttribute,
  removeAttribute,
  changeText,
] as const;

function runOperation(rng: () => number): void {
  pick(rng, OPERATIONS_BY_KIND)(rng);
}

function seedDocument(): void {
  document.head.replaceChildren();
  document.body.replaceChildren();
  const list = document.createElement("ul");
  list.setAttribute("id", "list");
  for (const label of ["A", "B", "C"]) {
    const item = document.createElement("li");
    item.textContent = label;
    list.append(item);
  }
  const note = document.createElement("p");
  note.textContent = "note";
  const stay = document.createElement("span");
  stay.setAttribute("class", "stay");
  stay.textContent = "stay";
  document.body.append(list, note, stay);
}

function outline(node: Node): string {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return listNodes(node.childNodes)
      .map((child) => outline(child))
      .join("");
  }
  if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
    return `<!DOCTYPE ${(node as DocumentType).name}>`;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const attributes = listAttributes(element)
      .map((attribute) => `${attribute.name}="${attribute.value}"`)
      .sort()
      .join(" ");
    const children = listNodes(element.childNodes)
      .map((child) => outline(child))
      .join("");
    const open = attributes.length > 0 ? ` ${attributes}` : "";
    return `<${element.localName}${open}>${children}</${element.localName}>`;
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return (node as Text).data;
  }
  if (node.nodeType === Node.COMMENT_NODE) {
    return `<!--${(node as Comment).data}-->`;
  }
  return "";
}

async function runFuzz(seed: number): Promise<void> {
  seedDocument();
  const ctx: SnapshotContext = {
    mirror: new Mirror(),
    clock: { now: () => 40 },
  };
  const events: RewindEvent[] = [takeFullSnapshot(document, ctx)];
  const observation = observeMutations(document, ctx, (event) => {
    events.push(event);
  });
  const rng = createPrng(seed);

  try {
    let leftInBatch = 1 + Math.floor(rng() * 5);
    for (let index = 0; index < OPERATIONS; index += 1) {
      runOperation(rng);
      leftInBatch -= 1;
      if (leftInBatch === 0) {
        await flushMutations();
        leftInBatch = 1 + Math.floor(rng() * 5);
      }
    }
    await flushMutations();

    expect(events.some((event) => event.type === "mutation")).toBe(true);
    const rebuilt = rebuild(events);
    expect(rebuilt).not.toBe(document);
    expect(rebuilt.isEqualNode(document), outline(rebuilt)).toBe(true);
  } finally {
    observation.stop();
  }
}

describe("mutation fuzz", () => {
  afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it.each(SEEDS)(
    "matches the live DOM after 200 operations with seed %i",
    async (seed) => {
      await runFuzz(seed);
    },
  );
});
