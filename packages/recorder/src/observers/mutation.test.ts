import type { MutationEvent, SerializedNode } from "@rewind/shared";
import { parseEvent } from "@rewind/shared";
import { afterEach, describe, expect, it } from "vitest";
import { Mirror } from "../mirror.js";
import { serializeNode } from "../snapshot/serialize-node.js";
import type { SnapshotContext } from "../snapshot/take-full-snapshot.js";
import { observeMutations } from "./mutation.js";

const NOW = 40;
const PASSWORD = "p@ss-mutation-9";
const CLICK = "mutationHack()";

/**
 * Delivers the queued MutationObserver callback.
 * happy-dom runs it as a microtask, so this does not use a timer.
 */
function flushMutations(): Promise<void> {
  return Promise.resolve();
}

interface Session {
  ctx: SnapshotContext;
  events: MutationEvent[];
  stop: () => void;
}

function begin(): Session {
  const ctx: SnapshotContext = {
    mirror: new Mirror(),
    clock: { now: () => NOW },
  };
  serializeNode(document, ctx);
  const events: MutationEvent[] = [];
  const observation = observeMutations(document, ctx, (event) => {
    events.push(event);
  });
  return {
    ctx,
    events,
    stop: () => {
      observation.stop();
    },
  };
}

function textNode(node: ChildNode | null): Text {
  if (node === null || node.nodeType !== Node.TEXT_NODE) {
    throw new Error("expected a text node");
  }
  return node as Text;
}

function onlyEvent(events: readonly MutationEvent[]): MutationEvent {
  expect(events).toHaveLength(1);
  const event = events[0];
  if (event === undefined) {
    throw new Error("expected a mutation event");
  }
  expect(event.timestamp).toBe(NOW);
  expect(parseEvent(event)).toMatchObject({ ok: true });
  return event;
}

describe("observeMutations", () => {
  afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it("records an added subtree as one mutation event", async () => {
    const session = begin();
    try {
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("onclick", CLICK);
      const secret = document.createElement("input");
      secret.type = "password";
      secret.name = "password";
      secret.value = PASSWORD;
      const label = document.createElement("span");
      label.textContent = "Pay";
      card.append(secret, label);
      document.body.append(card);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.seq).toBe(1);
      expect(event.data).toEqual({
        adds: [
          {
            parentId: session.ctx.mirror.getId(document.body),
            nextId: null,
            node: serializeNode(card, session.ctx),
          },
        ],
        removes: [],
        attributes: [],
        texts: [],
      });
      const recorded = JSON.stringify(event);
      expect(recorded).not.toContain(PASSWORD);
      expect(recorded).not.toContain(CLICK);
    } finally {
      session.stop();
    }
  });

  it("records a removed node", async () => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "Gone";
    document.body.append(paragraph);
    const session = begin();
    try {
      const id = session.ctx.mirror.getId(paragraph);
      const parentId = session.ctx.mirror.getId(document.body);
      paragraph.remove();
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data).toEqual({
        adds: [],
        removes: [{ parentId, id }],
        attributes: [],
        texts: [],
      });
    } finally {
      session.stop();
    }
  });

  it("records an attribute change", async () => {
    const button = document.createElement("button");
    document.body.append(button);
    const session = begin();
    try {
      button.setAttribute("class", "ready");
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data).toEqual({
        adds: [],
        removes: [],
        attributes: [
          {
            id: session.ctx.mirror.getId(button),
            name: "class",
            value: "ready",
          },
        ],
        texts: [],
      });
    } finally {
      session.stop();
    }
  });

  it("records a text change", async () => {
    const text = document.createTextNode("Pay");
    document.body.append(text);
    const session = begin();
    try {
      text.data = "Paying...";
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data).toEqual({
        adds: [],
        removes: [],
        attributes: [],
        texts: [{ id: session.ctx.mirror.getId(text), value: "Paying..." }],
      });
    } finally {
      session.stop();
    }
  });

  it("batches every record from one callback into one event", async () => {
    const session = begin();
    try {
      const first = document.createElement("span");
      first.textContent = "One";
      const second = document.createElement("em");
      second.textContent = "Two";
      document.body.append(first);
      document.body.append(second);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data.adds).toEqual([
        {
          parentId: session.ctx.mirror.getId(document.body),
          nextId: null,
          node: serializeNode(second, session.ctx),
        },
        {
          parentId: session.ctx.mirror.getId(document.body),
          nextId: session.ctx.mirror.getId(second),
          node: serializeNode(first, session.ctx),
        },
      ]);
      expect(event.data.removes).toEqual([]);
      expect(event.data.attributes).toEqual([]);
      expect(event.data.texts).toEqual([]);
    } finally {
      session.stop();
    }
  });

  it("emits a separate event for each callback", async () => {
    const session = begin();
    try {
      document.body.append(document.createElement("span"));
      await flushMutations();
      document.body.append(document.createElement("em"));
      await flushMutations();

      expect(session.events).toHaveLength(2);
      const first = session.events[0];
      const second = session.events[1];
      if (first === undefined || second === undefined) {
        throw new Error("expected two mutation events");
      }
      expect(first.seq).toBe(1);
      expect(second.seq).toBe(2);
      expect(first.data.adds).toHaveLength(1);
      expect(second.data.adds).toHaveLength(1);
      expect(parseEvent(first)).toMatchObject({ ok: true });
      expect(parseEvent(second)).toMatchObject({ ok: true });
    } finally {
      session.stop();
    }
  });

  it("stop disconnects the observer", async () => {
    const session = begin();
    try {
      document.body.append(document.createElement("span"));
      await flushMutations();
      expect(session.events).toHaveLength(1);

      session.stop();
      document.body.append(document.createElement("em"));
      await flushMutations();
      expect(session.events).toHaveLength(1);
    } finally {
      session.stop();
    }
  });
});

describe("mutation batch ordering", () => {
  afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it("drops a node added and removed in the same batch", async () => {
    const session = begin();
    try {
      const temp = document.createElement("div");
      temp.textContent = "nope";
      document.body.append(temp);
      temp.setAttribute("class", "x");
      textNode(temp.firstChild).data = "still-nope";
      temp.remove();
      await flushMutations();

      expect(session.events).toEqual([]);
    } finally {
      session.stop();
    }
  });

  it("keeps the id when a node is moved in the same batch", async () => {
    const host = document.createElement("section");
    const item = document.createElement("p");
    item.textContent = "move-me";
    document.body.append(host, item);
    const session = begin();
    try {
      const id = session.ctx.mirror.getId(item);
      const oldParent = session.ctx.mirror.getId(document.body);
      const newParent = session.ctx.mirror.getId(host);
      host.append(item);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data.removes).toEqual([{ parentId: oldParent, id }]);
      expect(event.data.adds).toEqual([
        {
          parentId: newParent,
          nextId: null,
          node: serializeNode(item, session.ctx),
        },
      ]);
      expect(event.data.adds[0]?.node.id).toBe(id);
      expect(session.ctx.mirror.getId(item)).toBe(id);
    } finally {
      session.stop();
    }
  });

  it("serializes a nested add once", async () => {
    const session = begin();
    try {
      const parent = document.createElement("div");
      document.body.append(parent);
      const child = document.createElement("span");
      parent.append(child);
      const grandchild = document.createElement("em");
      grandchild.textContent = "nested";
      child.append(grandchild);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data.adds).toEqual([
        {
          parentId: session.ctx.mirror.getId(document.body),
          nextId: null,
          node: serializeNode(parent, session.ctx),
        },
      ]);
      expect(event.data.removes).toEqual([]);
      expect(event.data.attributes).toEqual([]);
      expect(event.data.texts).toEqual([]);
    } finally {
      session.stop();
    }
  });

  it("keeps the last value of a repeated attribute", async () => {
    const button = document.createElement("button");
    document.body.append(button);
    const session = begin();
    try {
      button.setAttribute("class", "a");
      button.setAttribute("title", "x");
      button.setAttribute("class", "final");
      button.removeAttribute("title");
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data.attributes).toEqual([
        {
          id: session.ctx.mirror.getId(button),
          name: "class",
          value: "final",
        },
        {
          id: session.ctx.mirror.getId(button),
          name: "title",
          value: null,
        },
      ]);
      expect(event.data.adds).toEqual([]);
      expect(event.data.removes).toEqual([]);
      expect(event.data.texts).toEqual([]);
    } finally {
      session.stop();
    }
  });

  it("applies masking and blocking to mutations", async () => {
    const masked = document.createElement("p");
    masked.setAttribute("data-rewind-mask", "");
    masked.textContent = "open";
    const input = document.createElement("input");
    input.type = "text";
    const password = document.createElement("input");
    password.type = "password";
    const blocked = document.createElement("div");
    blocked.setAttribute("data-rewind-block", "");
    blocked.textContent = "inside";
    const select = document.createElement("select");
    const option = document.createElement("option");
    option.textContent = "Pear";
    option.value = "pear";
    select.append(option);
    document.body.append(masked, input, password, blocked, select);
    const session = begin();
    try {
      const secret = "secret-mask";
      const inputSecret = "secret-input";
      const passwordSecret = "secret-password";
      const titleSecret = "secret-title";
      const choice = "pear";
      const text = textNode(masked.firstChild);
      text.data = secret;
      input.setAttribute("value", inputSecret);
      password.setAttribute("value", passwordSecret);
      blocked.setAttribute("title", titleSecret);
      select.setAttribute("value", choice);
      option.setAttribute("selected", "");
      await flushMutations();

      const event = onlyEvent(session.events);
      const recorded = JSON.stringify(event);
      expect(recorded).not.toContain(secret);
      expect(recorded).not.toContain(inputSecret);
      expect(recorded).not.toContain(passwordSecret);
      expect(recorded).not.toContain(titleSecret);
      expect(recorded).not.toContain(`"value":"${choice}"`);
      expect(recorded).not.toContain('"selected"');
      expect(event.data.texts).toEqual([
        {
          id: session.ctx.mirror.getId(text),
          value: "*".repeat(secret.length),
        },
      ]);
      expect(event.data.attributes).toEqual([
        {
          id: session.ctx.mirror.getId(input),
          name: "value",
          value: "*".repeat(inputSecret.length),
        },
      ]);
    } finally {
      session.stop();
    }
  });

  it("strips event handlers and script content from mutations", async () => {
    const button = document.createElement("button");
    const script = document.createElement("script");
    document.body.append(button, script);
    const session = begin();
    try {
      button.setAttribute("onclick", "mutationHack()");
      script.append(document.createTextNode("window.__mutationSecret = 1;"));
      const injected = document.createElement("script");
      injected.textContent = "window.__otherSecret = 2;";
      injected.setAttribute("onclick", "otherHack()");
      document.body.append(injected);
      await flushMutations();

      const event = onlyEvent(session.events);
      const recorded = JSON.stringify(event);
      expect(recorded).not.toContain("mutationHack");
      expect(recorded).not.toContain("__mutationSecret");
      expect(recorded).not.toContain("__otherSecret");
      expect(recorded).not.toContain("otherHack");
      expect(event.data.attributes).toEqual([]);
      expect(event.data.texts).toEqual([]);
      expect(event.data.adds).toEqual([
        {
          parentId: session.ctx.mirror.getId(document.body),
          nextId: null,
          node: serializeNode(injected, session.ctx),
        },
      ]);
    } finally {
      session.stop();
    }
  });

  it("orders a batch as removes, adds, attributes, then text", async () => {
    const gone = document.createElement("p");
    gone.textContent = "old-gone";
    const stay = document.createElement("span");
    stay.textContent = "old-stay";
    document.body.append(gone, stay);
    const session = begin();
    try {
      const bodyId = session.ctx.mirror.getId(document.body);
      const goneId = session.ctx.mirror.getId(gone);
      const stayText = textNode(stay.firstChild);
      const stayTextId = session.ctx.mirror.getId(stayText);

      gone.setAttribute("class", "nope");
      textNode(gone.firstChild).data = "changed-gone";
      gone.remove();

      const fresh = document.createElement("div");
      fresh.textContent = "first";
      document.body.append(fresh);
      fresh.setAttribute("class", "new");
      textNode(fresh.firstChild).data = "second";

      stay.setAttribute("class", "on");
      stayText.data = "now";
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data).toEqual({
        removes: [{ parentId: bodyId, id: goneId }],
        adds: [
          {
            parentId: bodyId,
            nextId: null,
            node: serializeNode(fresh, session.ctx),
          },
        ],
        attributes: [
          {
            id: session.ctx.mirror.getId(stay),
            name: "class",
            value: "on",
          },
        ],
        texts: [{ id: stayTextId, value: "now" }],
      });
    } finally {
      session.stop();
    }
  });

  it("lists a new later sibling before the add that points at it", async () => {
    const session = begin();
    try {
      const first = document.createElement("span");
      first.textContent = "one";
      const second = document.createElement("span");
      second.textContent = "two";
      document.body.append(first, second);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data.adds).toHaveLength(2);
      const later = event.data.adds[0];
      const earlier = event.data.adds[1];
      if (later === undefined || earlier === undefined) {
        throw new Error("expected two adds");
      }
      expect(later.nextId).toBeNull();
      expect(later.node).toMatchObject({
        type: "Element",
        tagName: "span",
        childNodes: [{ type: "Text", textContent: "two" }],
      });
      expect(earlier.nextId).toBe(later.node.id);
      expect(earlier.node).toMatchObject({
        type: "Element",
        tagName: "span",
        childNodes: [{ type: "Text", textContent: "one" }],
      });
    } finally {
      session.stop();
    }
  });
});

const TYPED_PASSWORD = "typed-password-7";
const MASKED_TEXT = "mask-later-secret";
const BLOCKED_TEXT = "blocked-later-secret";
const CHOSEN = "kiwi";

function assertChoiceNotMatchable(node: SerializedNode): void {
  if (node.type !== "Element" && node.type !== "Document") {
    return;
  }
  if (node.type === "Element" && node.tagName === "select") {
    expect(node.attributes.value).toBeUndefined();
    const optionStars: string[] = [];
    for (const child of node.childNodes) {
      if (child.type !== "Element") {
        continue;
      }
      expect(child.attributes.selected).toBeUndefined();
      const value = child.attributes.value;
      if (typeof value === "string") {
        optionStars.push(value);
      }
    }
    for (const attribute of Object.values(node.attributes)) {
      if (typeof attribute !== "string" || !/^\*+$/.test(attribute)) {
        continue;
      }
      const matches = optionStars.filter((stars) => stars === attribute);
      expect(matches).not.toHaveLength(1);
    }
  }
  if (node.type === "Element") {
    for (const child of node.childNodes) {
      assertChoiceNotMatchable(child);
    }
  }
}

describe("mutation positions and privacy", () => {
  afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it("records insertBefore in the middle with parentId and nextId", async () => {
    const list = document.createElement("ul");
    const first = document.createElement("li");
    first.textContent = "one";
    const third = document.createElement("li");
    third.textContent = "three";
    list.append(first, third);
    document.body.append(list);
    const session = begin();
    try {
      const parentId = session.ctx.mirror.getId(list);
      const nextId = session.ctx.mirror.getId(third);
      const second = document.createElement("li");
      second.textContent = "two";
      list.insertBefore(second, third);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data.adds).toEqual([
        {
          parentId,
          nextId,
          node: serializeNode(second, session.ctx),
        },
      ]);
      expect(nextId).not.toBeNull();
      expect(event.data.removes).toEqual([]);
      expect(event.data.attributes).toEqual([]);
      expect(event.data.texts).toEqual([]);
    } finally {
      session.stop();
    }
  });

  it("records an append as the last child with nextId null", async () => {
    const list = document.createElement("ol");
    const first = document.createElement("li");
    first.textContent = "one";
    list.append(first);
    document.body.append(list);
    const session = begin();
    try {
      const last = document.createElement("li");
      last.textContent = "last";
      list.append(last);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(last.nextSibling).toBeNull();
      expect(event.data.adds).toEqual([
        {
          parentId: session.ctx.mirror.getId(list),
          nextId: null,
          node: serializeNode(last, session.ctx),
        },
      ]);
    } finally {
      session.stop();
    }
  });

  it("masks and blocks an element added later", async () => {
    const session = begin();
    try {
      const card = document.createElement("section");
      card.setAttribute("data-rewind-mask", "");
      const label = document.createElement("p");
      label.textContent = MASKED_TEXT;
      const select = document.createElement("select");
      const kiwi = document.createElement("option");
      kiwi.value = CHOSEN;
      kiwi.textContent = "Kiwi";
      const banana = document.createElement("option");
      banana.value = "banana";
      banana.textContent = "Banana";
      select.append(kiwi, banana);
      select.value = CHOSEN;
      select.setAttribute("value", CHOSEN);
      kiwi.setAttribute("selected", "");
      card.append(label, select);

      const blocked = document.createElement("div");
      blocked.setAttribute("data-rewind-block", "");
      blocked.setAttribute("title", BLOCKED_TEXT);
      blocked.textContent = BLOCKED_TEXT;

      document.body.append(card, blocked);
      await flushMutations();

      const event = onlyEvent(session.events);
      expect(event.data.adds).toEqual([
        {
          parentId: session.ctx.mirror.getId(document.body),
          nextId: null,
          node: serializeNode(blocked, session.ctx),
        },
        {
          parentId: session.ctx.mirror.getId(document.body),
          nextId: session.ctx.mirror.getId(blocked),
          node: serializeNode(card, session.ctx),
        },
      ]);
      const cardNode = event.data.adds.find(
        (add) => add.node.type === "Element" && add.node.tagName === "section",
      )?.node;
      if (cardNode === undefined) {
        throw new Error("expected the masked element");
      }
      assertChoiceNotMatchable(cardNode);
      const recorded = JSON.stringify(event);
      expect(recorded).not.toContain(MASKED_TEXT);
      expect(recorded).not.toContain(BLOCKED_TEXT);
      expect(recorded).not.toContain(CHOSEN);
      expect(recorded).not.toContain('"selected"');
    } finally {
      session.stop();
    }
  });

  it("does not record a password typed into a new input", async () => {
    const session = begin();
    try {
      const input = document.createElement("input");
      input.type = "password";
      input.name = "password";
      input.value = TYPED_PASSWORD;
      input.setAttribute("value", TYPED_PASSWORD);
      input.append(document.createTextNode(TYPED_PASSWORD));
      document.body.append(input);
      await flushMutations();

      input.value = `${TYPED_PASSWORD}-again`;
      await flushMutations();
      input.setAttribute("value", `${TYPED_PASSWORD}-attr`);
      await flushMutations();

      expect(session.events).toHaveLength(1);
      const event = onlyEvent(session.events);
      const node = event.data.adds[0]?.node;
      expect(node).toMatchObject({
        type: "Element",
        tagName: "input",
        attributes: { type: "password", name: "password" },
        childNodes: [],
      });
      if (node?.type === "Element") {
        expect(node.attributes.value).toBeUndefined();
      }
      const recorded = JSON.stringify(session.events);
      expect(recorded).not.toContain(TYPED_PASSWORD);
      expect(recorded).not.toContain(`${TYPED_PASSWORD}-again`);
      expect(recorded).not.toContain(`${TYPED_PASSWORD}-attr`);
    } finally {
      session.stop();
    }
  });
});
