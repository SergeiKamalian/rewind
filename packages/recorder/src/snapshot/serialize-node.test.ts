import type { DocumentNode, SerializedNode } from "@rewind/shared";
import { describe, expect, it } from "vitest";
import { Mirror } from "../mirror.js";
import { type SerializeContext, serializeNode } from "./serialize-node.js";

const SIMPLE_PAGE = [
  '<!DOCTYPE html><html lang="en"><head>',
  "<title>Hello</title><style>.a{color:red}</style>",
  "</head><body>",
  '<button disabled onclick="hack()">Go</button>',
  '<script src="https://cdn.example/app.js" async>',
  "window.secret = 1</script>",
  "</body></html>",
].join("");

const NESTED_PAGE = [
  "<!DOCTYPE html><html><body>",
  '<div id="app"><ul>',
  '<li class="item">One</li>',
  '<li class="item"><span>Two</span></li>',
  "</ul><!--end--></div>",
  "</body></html>",
].join("");

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function context(): SerializeContext {
  return { mirror: new Mirror() };
}

function idsOf(node: SerializedNode): number[] {
  const ids: number[] = [];
  const visit = (current: SerializedNode): void => {
    ids.push(current.id);
    if (current.type === "Document" || current.type === "Element") {
      for (const child of current.childNodes) {
        visit(child);
      }
    }
  };
  visit(node);
  return ids;
}

describe("serializeNode", () => {
  it("serializes a simple page", () => {
    const serialized = serializeNode(parse(SIMPLE_PAGE), context());
    const expected: DocumentNode = {
      id: 1,
      type: "Document",
      childNodes: [
        {
          id: 2,
          type: "Doctype",
          name: "html",
          publicId: "",
          systemId: "",
        },
        {
          id: 3,
          type: "Element",
          tagName: "html",
          attributes: { lang: "en" },
          childNodes: [
            {
              id: 4,
              type: "Element",
              tagName: "head",
              attributes: {},
              childNodes: [
                {
                  id: 5,
                  type: "Element",
                  tagName: "title",
                  attributes: {},
                  childNodes: [{ id: 6, type: "Text", textContent: "Hello" }],
                },
                {
                  id: 7,
                  type: "Element",
                  tagName: "style",
                  attributes: {},
                  childNodes: [
                    { id: 8, type: "Text", textContent: ".a{color:red}" },
                  ],
                },
              ],
            },
            {
              id: 9,
              type: "Element",
              tagName: "body",
              attributes: {},
              childNodes: [
                {
                  id: 10,
                  type: "Element",
                  tagName: "button",
                  attributes: { disabled: true },
                  childNodes: [{ id: 11, type: "Text", textContent: "Go" }],
                },
                {
                  id: 12,
                  type: "Element",
                  tagName: "script",
                  attributes: {
                    src: "https://cdn.example/app.js",
                    async: true,
                  },
                  childNodes: [],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(serialized).toEqual(expected);
    expect(JSON.stringify(serialized)).not.toContain("hack()");
    expect(JSON.stringify(serialized)).not.toContain("onclick");
    expect(JSON.stringify(serialized)).not.toContain("window.secret");
  });

  it("serializes a nested page", () => {
    const serialized = serializeNode(parse(NESTED_PAGE), context());
    const expected: DocumentNode = {
      id: 1,
      type: "Document",
      childNodes: [
        {
          id: 2,
          type: "Doctype",
          name: "html",
          publicId: "",
          systemId: "",
        },
        {
          id: 3,
          type: "Element",
          tagName: "html",
          attributes: {},
          childNodes: [
            {
              id: 4,
              type: "Element",
              tagName: "head",
              attributes: {},
              childNodes: [],
            },
            {
              id: 5,
              type: "Element",
              tagName: "body",
              attributes: {},
              childNodes: [
                {
                  id: 6,
                  type: "Element",
                  tagName: "div",
                  attributes: { id: "app" },
                  childNodes: [
                    {
                      id: 7,
                      type: "Element",
                      tagName: "ul",
                      attributes: {},
                      childNodes: [
                        {
                          id: 8,
                          type: "Element",
                          tagName: "li",
                          attributes: { class: "item" },
                          childNodes: [
                            { id: 9, type: "Text", textContent: "One" },
                          ],
                        },
                        {
                          id: 10,
                          type: "Element",
                          tagName: "li",
                          attributes: { class: "item" },
                          childNodes: [
                            {
                              id: 11,
                              type: "Element",
                              tagName: "span",
                              attributes: {},
                              childNodes: [
                                { id: 12, type: "Text", textContent: "Two" },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    { id: 13, type: "Comment", textContent: "end" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(serialized).toEqual(expected);
    if (serialized) {
      const ids = idsOf(serialized);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids[0]).toBe(1);
    }
  });

  it("keeps the same ids when the same mirror serializes again", () => {
    const doc = parse(SIMPLE_PAGE);
    const ctx = context();
    const first = serializeNode(doc, ctx);
    const second = serializeNode(doc, ctx);

    expect(second).toEqual(first);
    expect(first).toBeDefined();
  });

  it("stores boolean attributes as true and keeps other strings", () => {
    const doc = document.implementation.createHTMLDocument("");
    const element = doc.createElement("div");
    element.setAttribute("disabled", "");
    element.setAttribute("checked", "checked");
    element.setAttribute("required", "Required");
    element.setAttribute("hidden", "until-found");
    element.setAttribute("alt", "");
    element.setAttribute("data-empty", "");
    element.setAttribute("data-online", "yes");
    element.setAttribute("onclick", "nope()");
    element.setAttribute("onload", "nope()");
    doc.body.append(element);

    const serialized = serializeNode(element, context());

    expect(serialized).toMatchObject({
      type: "Element",
      tagName: "div",
      attributes: {
        disabled: true,
        checked: true,
        required: true,
        hidden: "until-found",
        alt: "",
        "data-empty": "",
        "data-online": "yes",
      },
    });
    if (serialized?.type === "Element") {
      expect(serialized.attributes).not.toHaveProperty("onclick");
      expect(serialized.attributes).not.toHaveProperty("onload");
    }
  });

  it("keeps a script element and drops its children", () => {
    const doc = document.implementation.createHTMLDocument("");
    const script = doc.createElement("script");
    const secret = doc.createTextNode("secret()");
    const span = doc.createElement("span");
    span.textContent = "nope";
    script.setAttribute("type", "text/javascript");
    script.setAttribute("onclick", "nope()");
    script.append(secret, span);
    doc.body.append(script);
    const mirror = new Mirror();

    const serialized = serializeNode(script, { mirror });

    expect(serialized).toMatchObject({
      type: "Element",
      tagName: "script",
      attributes: { type: "text/javascript" },
      childNodes: [],
    });
    expect(mirror.has(secret)).toBe(false);
    expect(mirror.has(span)).toBe(false);
    expect(JSON.stringify(serialized)).not.toContain("secret()");
  });

  it("serializes a doctype with public and system ids", () => {
    const doctype = document.implementation.createDocumentType(
      "html",
      "-//W3C//DTD HTML 4.01//EN",
      "http://www.w3.org/TR/html4/strict.dtd",
    );

    expect(serializeNode(doctype, context())).toEqual({
      id: 1,
      type: "Doctype",
      name: "html",
      publicId: "-//W3C//DTD HTML 4.01//EN",
      systemId: "http://www.w3.org/TR/html4/strict.dtd",
    });
  });

  it("serializes text and comments without the comment delimiters", () => {
    const doc = document.implementation.createHTMLDocument("");
    const text = doc.createTextNode("");
    const comment = doc.createComment("note");

    expect(serializeNode(text, context())).toEqual({
      id: 1,
      type: "Text",
      textContent: "",
    });
    expect(serializeNode(comment, context())).toEqual({
      id: 1,
      type: "Comment",
      textContent: "note",
    });
  });

  it("keeps non-HTML tag and attribute case and strips on* names", () => {
    const doc = document.implementation.createHTMLDocument("");
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    const gradient = doc.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient",
    );
    gradient.setAttribute("ONCLICK", "nope()");
    gradient.setAttribute("viewBox", "0 0 1 1");
    svg.append(gradient);

    const serialized = serializeNode(svg, context());

    expect(serialized).toMatchObject({
      type: "Element",
      tagName: "svg",
      childNodes: [
        {
          type: "Element",
          tagName: "linearGradient",
          attributes: { viewBox: "0 0 1 1" },
        },
      ],
    });
    expect(JSON.stringify(serialized)).not.toContain("ONCLICK");
    expect(JSON.stringify(serialized)).not.toContain("nope()");
  });

  it("skips node kinds it does not record", () => {
    const doc = document.implementation.createHTMLDocument("");
    const instruction = doc.createProcessingInstruction(
      "xml-stylesheet",
      'href="a.css"',
    );
    doc.insertBefore(instruction, doc.documentElement);
    const mirror = new Mirror();

    const serialized = serializeNode(doc, { mirror });

    expect(serialized).toMatchObject({
      type: "Document",
      childNodes: [{ type: "Element", tagName: "html" }],
    });
    expect(mirror.has(instruction)).toBe(false);
    expect(JSON.stringify(serialized)).not.toContain("a.css");
  });
});
