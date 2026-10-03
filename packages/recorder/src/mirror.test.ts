import { describe, expect, it } from "vitest";
import { Mirror } from "./mirror.js";

function element(): HTMLElement {
  return document.createElement("div");
}

describe("Mirror", () => {
  it("assigns ids starting at 1", () => {
    const mirror = new Mirror();

    expect(mirror.getId(element())).toBe(1);
  });

  it("returns the same id for the same node", () => {
    const mirror = new Mirror();
    const node = element();

    expect(mirror.getId(node)).toBe(1);
    expect(mirror.getId(node)).toBe(1);
  });

  it("gives each distinct node its own id", () => {
    const mirror = new Mirror();
    const first = element();
    const second = element();
    const text = document.createTextNode("hello");
    const comment = document.createComment("note");

    expect(mirror.getId(document)).toBe(1);
    expect(mirror.getId(first)).toBe(2);
    expect(mirror.getId(second)).toBe(3);
    expect(mirror.getId(text)).toBe(4);
    expect(mirror.getId(comment)).toBe(5);
    expect(mirror.getId(first)).toBe(2);
  });

  it("does not reuse an id after the node is removed", () => {
    const mirror = new Mirror();
    const removed = element();
    const id = mirror.getId(removed);

    mirror.remove(removed);

    expect(mirror.getId(element())).toBe(id + 1);
  });

  it("returns the node for its id until remove", () => {
    const mirror = new Mirror();
    const node = element();
    const id = mirror.getId(node);

    expect(mirror.getNode(id)).toBe(node);
  });

  it("returns undefined from getNode after remove", () => {
    const mirror = new Mirror();
    const node = element();
    const id = mirror.getId(node);

    mirror.remove(node);

    expect(mirror.getNode(id)).toBeUndefined();
    expect(mirror.has(node)).toBe(false);
  });

  it("reports membership with has", () => {
    const mirror = new Mirror();
    const node = element();

    expect(mirror.has(node)).toBe(false);

    mirror.getId(node);

    expect(mirror.has(node)).toBe(true);

    mirror.remove(node);

    expect(mirror.has(node)).toBe(false);
  });

  it("leaves other nodes in place when one is removed", () => {
    const mirror = new Mirror();
    const keep = element();
    const drop = element();
    const keepId = mirror.getId(keep);
    const dropId = mirror.getId(drop);

    mirror.remove(drop);

    expect(mirror.getId(keep)).toBe(keepId);
    expect(mirror.getNode(keepId)).toBe(keep);
    expect(mirror.has(keep)).toBe(true);
    expect(mirror.getNode(dropId)).toBeUndefined();
    expect(mirror.has(drop)).toBe(false);
  });

  it("assigns a fresh id when a removed node is seen again", () => {
    const mirror = new Mirror();
    const node = element();
    const firstId = mirror.getId(node);

    mirror.remove(node);

    const secondId = mirror.getId(node);

    expect(secondId).not.toBe(firstId);
    expect(mirror.getNode(firstId)).toBeUndefined();
    expect(mirror.getNode(secondId)).toBe(node);
    expect(mirror.has(node)).toBe(true);
  });

  it("ignores remove when the node was never registered", () => {
    const mirror = new Mirror();

    expect(() => mirror.remove(element())).not.toThrow();
    expect(mirror.getId(element())).toBe(1);
  });

  it("ignores a second remove of the same node", () => {
    const mirror = new Mirror();
    const node = element();
    mirror.getId(node);
    mirror.remove(node);

    expect(() => mirror.remove(node)).not.toThrow();
    expect(mirror.getId(element())).toBe(2);
  });

  it("returns undefined for an id that was never assigned", () => {
    const mirror = new Mirror();

    expect(mirror.getNode(0)).toBeUndefined();
    expect(mirror.getNode(1)).toBeUndefined();
  });

  it("starts each mirror at 1", () => {
    const first = new Mirror();
    const second = new Mirror();
    const node = element();

    expect(first.getId(node)).toBe(1);
    expect(second.getId(node)).toBe(1);
    expect(first.getNode(1)).toBe(node);
    expect(second.getNode(1)).toBe(node);
  });
});
