import type { RewindEvent } from "@rewind/shared";
import { afterEach, describe, expect, it } from "vitest";
import { rebuild } from "../test-utils/rebuild.js";
import * as recorder from "./index.js";
import { Mirror } from "./mirror.js";
import { observeMutations } from "./observers/mutation.js";
import {
  type SnapshotContext,
  takeFullSnapshot,
} from "./snapshot/take-full-snapshot.js";

/**
 * Delivers the queued MutationObserver callback.
 * happy-dom runs it as a microtask, so this does not use a timer.
 */
function flushMutations(): Promise<void> {
  return Promise.resolve();
}

function textNode(node: ChildNode | null): Text {
  if (node === null || node.nodeType !== Node.TEXT_NODE) {
    throw new Error("expected a text node");
  }
  return node as Text;
}

describe("rebuild", () => {
  afterEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it("is not exported from the package", () => {
    expect("rebuild" in recorder).toBe(false);
  });

  it("rebuilds the live DOM after a scripted scenario", async () => {
    document.head.replaceChildren();
    document.body.replaceChildren();

    const list = document.createElement("ul");
    list.id = "list";
    const itemA = document.createElement("li");
    itemA.textContent = "A";
    const itemB = document.createElement("li");
    itemB.textContent = "B";
    const itemC = document.createElement("li");
    itemC.textContent = "C";
    list.append(itemA, itemB, itemC);
    const note = document.createElement("p");
    note.textContent = "note";
    const stay = document.createElement("span");
    stay.textContent = "stay";
    document.body.append(list, note, stay);

    const ctx: SnapshotContext = {
      mirror: new Mirror(),
      clock: { now: () => 40 },
    };
    const events: RewindEvent[] = [takeFullSnapshot(document, ctx)];
    const observation = observeMutations(document, ctx, (event) => {
      events.push(event);
    });

    try {
      note.remove();
      await flushMutations();

      const section = document.createElement("section");
      document.body.append(section);
      section.append(itemA);
      await flushMutations();

      const wrap = document.createElement("div");
      document.body.append(wrap);
      const inner = document.createElement("span");
      wrap.append(inner);
      const emphasis = document.createElement("em");
      emphasis.textContent = "nested";
      inner.append(emphasis);
      await flushMutations();

      const mid = document.createElement("li");
      mid.textContent = "mid";
      list.insertBefore(mid, itemC);
      await flushMutations();

      stay.setAttribute("class", "ready");
      await flushMutations();

      textNode(stay.firstChild).data = "updated";
      await flushMutations();

      expect(events.filter((event) => event.type === "mutation")).toHaveLength(
        6,
      );

      const rebuilt = rebuild(events);
      expect(rebuilt).not.toBe(document);
      expect(rebuilt.isEqualNode(document)).toBe(true);
    } finally {
      observation.stop();
    }
  });
});
