import type { MutationEvent } from "@rewind/shared";
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
          nextId: session.ctx.mirror.getId(second),
          node: serializeNode(first, session.ctx),
        },
        {
          parentId: session.ctx.mirror.getId(document.body),
          nextId: null,
          node: serializeNode(second, session.ctx),
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
