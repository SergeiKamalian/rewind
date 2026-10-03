import { describe, expect, it } from "vitest";
import { Mirror } from "./mirror.js";
import type { PrivacyOptions } from "./privacy.js";
import {
  type SerializeContext,
  serializeNode,
} from "./snapshot/serialize-node.js";

const PASSWORD = "p@ss-unique-9";

function context(privacy?: PrivacyOptions): SerializeContext {
  const mirror = new Mirror();
  if (privacy === undefined) {
    return { mirror };
  }
  return { mirror, privacy };
}

function json(node: Node, privacy?: PrivacyOptions): string {
  return JSON.stringify(serializeNode(node, context(privacy)));
}

describe("privacy", () => {
  it("never records a password value", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "password";
    input.name = "password";
    input.value = PASSWORD;
    input.setAttribute("value", PASSWORD);
    const hint = document.createElement("p");
    hint.textContent = "Enter the password";
    form.append(input, hint);

    const output = json(form);
    const outputOptOut = json(form, { maskAllInputs: false });

    expect(output).not.toContain(PASSWORD);
    expect(outputOptOut).not.toContain(PASSWORD);
    const serialized = serializeNode(input, context());
    expect(serialized).toMatchObject({
      type: "Element",
      tagName: "input",
      attributes: { type: "password", name: "password" },
    });
    if (serialized?.type === "Element") {
      expect(serialized.attributes.value).toBeUndefined();
    }
  });

  it("masks text marked with data-rewind-mask or the rewind-mask class", () => {
    const marked = document.createElement("p");
    marked.setAttribute("data-rewind-mask", "");
    marked.textContent = "Hello";
    const classed = document.createElement("span");
    classed.className = "rewind-mask extra";
    classed.textContent = "ab";
    const wrap = document.createElement("div");
    const shown = document.createElement("span");
    shown.textContent = "Show";
    wrap.append(marked, classed, shown);

    const serialized = serializeNode(wrap, context());

    expect(serialized).toMatchObject({
      type: "Element",
      childNodes: [
        {
          tagName: "p",
          childNodes: [{ type: "Text", textContent: "*****" }],
        },
        {
          tagName: "span",
          childNodes: [{ type: "Text", textContent: "**" }],
        },
        {
          tagName: "span",
          childNodes: [{ type: "Text", textContent: "Show" }],
        },
      ],
    });
    expect("Hello".length).toBe(5);
    expect("ab".length).toBe(2);
  });

  it("masks text matched by maskTextSelector", () => {
    const note = document.createElement("span");
    note.className = "secret";
    note.textContent = "hide-me";

    expect(
      serializeNode(note, context({ maskTextSelector: ".secret" })),
    ).toMatchObject({
      childNodes: [{ type: "Text", textContent: "*******" }],
    });
    expect("hide-me".length).toBe(7);
  });

  it("replaces a blocked element with an empty box of the same size", () => {
    const card = document.createElement("section");
    card.setAttribute("data-rewind-block", "");
    card.style.width = "120px";
    card.style.height = "40px";
    card.textContent = "card-secret-text";
    document.body.append(card);

    const serialized = serializeNode(card, context());

    expect(serialized).toMatchObject({
      type: "Element",
      tagName: "section",
      attributes: { width: "120px", height: "40px" },
      childNodes: [],
    });
    expect(json(card)).not.toContain("card-secret-text");
  });

  it("blocks elements matched by blockSelector", () => {
    const card = document.createElement("div");
    card.className = "private";
    card.style.width = "80px";
    card.style.height = "20px";
    card.textContent = "block-secret";
    document.body.append(card);

    const serialized = serializeNode(
      card,
      context({ blockSelector: ".private" }),
    );

    expect(serialized).toMatchObject({
      tagName: "div",
      attributes: { width: "80px", height: "20px" },
      childNodes: [],
    });
    expect(json(card, { blockSelector: ".private" })).not.toContain(
      "block-secret",
    );
  });

  it("records a checkbox from its checked property", () => {
    const on = document.createElement("input");
    on.type = "checkbox";
    on.checked = true;
    on.value = "agree";
    const off = document.createElement("input");
    off.type = "checkbox";
    off.setAttribute("checked", "");
    off.checked = false;

    expect(serializeNode(on, context())).toMatchObject({
      tagName: "input",
      attributes: { type: "checkbox", checked: true, value: "*****" },
    });
    expect(serializeNode(off, context())).toMatchObject({
      tagName: "input",
      attributes: { type: "checkbox" },
    });
    const offSerialized = serializeNode(off, context());
    if (offSerialized?.type === "Element") {
      expect(offSerialized.attributes.checked).toBeUndefined();
    }
  });

  it("records the selected option and masks the select value by default", () => {
    const select = document.createElement("select");
    const apple = document.createElement("option");
    apple.value = "apple";
    apple.textContent = "Apple";
    const pear = document.createElement("option");
    pear.value = "pear";
    pear.textContent = "Pear";
    select.append(apple, pear);
    select.value = "pear";

    const serialized = serializeNode(select, context());

    expect(serialized).toMatchObject({
      tagName: "select",
      attributes: { value: "****" },
      childNodes: [
        { tagName: "option", attributes: { value: "*****" } },
        {
          tagName: "option",
          attributes: { value: "****", selected: true },
        },
      ],
    });
    expect(json(select)).not.toContain("pear");
    expect("pear".length).toBe(4);
    expect("apple".length).toBe(5);
  });

  it("records input and select values when maskAllInputs is off", () => {
    const input = document.createElement("input");
    input.type = "email";
    input.value = "ada@example.com";
    const select = document.createElement("select");
    const pear = document.createElement("option");
    pear.value = "pear";
    pear.textContent = "Pear";
    select.append(pear);
    select.value = "pear";
    const privacy = { maskAllInputs: false } satisfies PrivacyOptions;

    expect(serializeNode(input, context(privacy))).toMatchObject({
      tagName: "input",
      attributes: { type: "email", value: "ada@example.com" },
    });
    expect(serializeNode(select, context(privacy))).toMatchObject({
      tagName: "select",
      attributes: { value: "pear" },
      childNodes: [
        {
          tagName: "option",
          attributes: { value: "pear", selected: true },
        },
      ],
    });
    expect(json(input, privacy)).toContain("ada@example.com");
    expect(json(select, privacy)).toContain("pear");
  });

  it("masks input values when maskAllInputs is on", () => {
    const input = document.createElement("input");
    input.type = "email";
    input.value = "ada@example.com";

    expect(
      serializeNode(input, context({ maskAllInputs: true })),
    ).toMatchObject({
      tagName: "input",
      attributes: { type: "email", value: "***************" },
    });
    expect(json(input, { maskAllInputs: true })).not.toContain(
      "ada@example.com",
    );
    expect("ada@example.com".length).toBe(15);
  });
});
