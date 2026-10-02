import type { ElementNode } from "@rewind/shared";
import { beforeAll, describe, expect, it } from "vitest";
import { Mirror } from "../mirror.js";
import { type SerializeContext, serializeNode } from "./serialize-node.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PAGE = "https://shop.example/app/index.html";

function context(): SerializeContext {
  return { mirror: new Mirror() };
}

function documentWithBase(): Document {
  const doc = document.implementation.createHTMLDocument("");
  const base = doc.createElement("base");
  base.href = PAGE;
  doc.head.append(base);
  return doc;
}

function installSheets(
  doc: Document,
  sheets: ReadonlyArray<{
    href: string | null;
    ownerNode: Element | null;
    rules: readonly string[] | null;
  }>,
): void {
  const list = sheets.map((sheet) => ({
    href: sheet.href,
    ownerNode: sheet.ownerNode,
    get cssRules(): {
      length: number;
      item: (index: number) => { cssText: string } | null;
    } {
      if (sheet.rules === null) {
        throw new DOMException("Cannot access rules", "SecurityError");
      }
      const rules = sheet.rules.map((cssText) => ({ cssText }));
      return {
        length: rules.length,
        item: (index: number) => rules[index] ?? null,
      };
    },
  }));
  Object.defineProperty(doc, "styleSheets", {
    configurable: true,
    get() {
      return {
        length: list.length,
        item: (index: number) => list[index] ?? null,
      };
    },
  });
}

describe("serializeNode assets", () => {
  beforeAll(() => {
    const browser = window as Window & {
      happyDOM?: { settings: { disableCSSFileLoading: boolean } };
    };
    if (browser.happyDOM) {
      browser.happyDOM.settings.disableCSSFileLoading = true;
    }
  });

  it("resolves relative src, href, and a multi-candidate srcset", () => {
    const doc = documentWithBase();
    const picture = doc.createElement("img");
    picture.setAttribute("src", "logo.png");
    picture.setAttribute(
      "srcset",
      "small.png 1x, /large.png 2x, https://cdn.example/x.png 400w",
    );
    const home = doc.createElement("a");
    home.setAttribute("href", "docs/guide.html?q=1#top");
    const protocol = doc.createElement("img");
    protocol.setAttribute("src", "//cdn.example/a.png");
    const empty = doc.createElement("img");
    empty.setAttribute("src", "");
    const symbol = doc.createElementNS(SVG_NAMESPACE, "use");
    symbol.setAttribute("href", "#sym");
    doc.body.append(picture, home, protocol, empty, symbol);

    const serialized = serializeNode(doc.body, context());

    expect(serialized).toMatchObject({
      type: "Element",
      tagName: "body",
      childNodes: [
        {
          type: "Element",
          tagName: "img",
          attributes: {
            src: "https://shop.example/app/logo.png",
            srcset: [
              "https://shop.example/app/small.png 1x",
              "https://shop.example/large.png 2x",
              "https://cdn.example/x.png 400w",
            ].join(", "),
          },
        },
        {
          type: "Element",
          tagName: "a",
          attributes: {
            href: "https://shop.example/app/docs/guide.html?q=1#top",
          },
        },
        {
          type: "Element",
          tagName: "img",
          attributes: { src: "https://cdn.example/a.png" },
        },
        {
          type: "Element",
          tagName: "img",
          attributes: { src: "" },
        },
        {
          type: "Element",
          tagName: "use",
          isSVG: true,
          attributes: { href: "#sym" },
        },
      ],
    });
  });

  it("marks SVG elements and leaves HTML inside foreignObject unmarked", () => {
    const doc = documentWithBase();
    const svg = doc.createElementNS(SVG_NAMESPACE, "svg");
    const image = doc.createElementNS(SVG_NAMESPACE, "image");
    image.setAttribute("href", "icon.svg");
    const foreign = doc.createElementNS(SVG_NAMESPACE, "foreignObject");
    const label = doc.createElement("div");
    label.textContent = "Hi";
    foreign.append(label);
    svg.append(image, foreign);

    const serialized = serializeNode(svg, context());

    expect(serialized).toMatchObject({
      type: "Element",
      tagName: "svg",
      isSVG: true,
      childNodes: [
        {
          type: "Element",
          tagName: "image",
          isSVG: true,
          attributes: { href: "https://shop.example/app/icon.svg" },
        },
        {
          type: "Element",
          tagName: "foreignObject",
          isSVG: true,
          childNodes: [
            {
              type: "Element",
              tagName: "div",
              childNodes: [{ type: "Text", textContent: "Hi" }],
            },
          ],
        },
      ],
    });
    if (
      serialized?.type === "Element" &&
      serialized.childNodes[1]?.type === "Element"
    ) {
      const html = serialized.childNodes[1].childNodes[0];
      expect(html?.type === "Element" && html.isSVG).toBeUndefined();
    }
  });

  it("serializes an open shadow root after the light DOM children", () => {
    const doc = document.implementation.createHTMLDocument("");
    const host = doc.createElement("div");
    host.setAttribute("id", "host");
    const light = doc.createElement("span");
    light.textContent = "light";
    host.append(light);
    const shadow = host.attachShadow({ mode: "open" });
    const bold = doc.createElement("b");
    bold.textContent = "dark";
    shadow.append(bold);

    const serialized = serializeNode(host, context());
    const expected: ElementNode = {
      id: 1,
      type: "Element",
      tagName: "div",
      attributes: { id: "host" },
      childNodes: [
        {
          id: 2,
          type: "Element",
          tagName: "span",
          attributes: {},
          childNodes: [{ id: 3, type: "Text", textContent: "light" }],
        },
        {
          id: 4,
          type: "Element",
          tagName: "shadow-root",
          attributes: {},
          isShadowRoot: true,
          childNodes: [
            {
              id: 5,
              type: "Element",
              tagName: "b",
              attributes: {},
              childNodes: [{ id: 6, type: "Text", textContent: "dark" }],
            },
          ],
        },
      ],
    };

    expect(serialized).toEqual(expected);
  });

  it("does not record a closed shadow root", () => {
    const doc = document.implementation.createHTMLDocument("");
    const host = doc.createElement("div");
    const shadow = host.attachShadow({ mode: "closed" });
    const secret = doc.createElement("b");
    secret.textContent = "secret-shadow";
    shadow.append(secret);

    const serialized = serializeNode(host, context());

    expect(serialized).toEqual({
      id: 1,
      type: "Element",
      tagName: "div",
      attributes: {},
      childNodes: [],
    });
    expect(JSON.stringify(serialized)).not.toContain("secret-shadow");
  });

  it("inlines a same-origin stylesheet and keeps the text id stable", () => {
    const doc = documentWithBase();
    const link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "theme.css");
    link.setAttribute("media", "print");
    doc.head.append(link);
    installSheets(doc, [
      {
        href: "https://shop.example/app/theme.css",
        ownerNode: link,
        rules: [".theme{color:green}", "h1{font-size:2rem}"],
      },
    ]);
    const mirror = new Mirror();
    const first = serializeNode(link, { mirror });
    const expected: ElementNode = {
      id: 1,
      type: "Element",
      tagName: "style",
      attributes: { media: "print" },
      childNodes: [
        {
          id: 2,
          type: "Text",
          textContent: ".theme{color:green}\nh1{font-size:2rem}",
        },
      ],
    };

    expect(first).toEqual(expected);
    expect(serializeNode(link, { mirror })).toEqual(first);
  });

  it("inlines a stylesheet matched by absolute href when ownerNode is missing", () => {
    const doc = documentWithBase();
    const link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "theme.css");
    doc.head.append(link);
    installSheets(doc, [
      {
        href: "https://shop.example/app/theme.css",
        ownerNode: null,
        rules: ["body{margin:0}"],
      },
    ]);

    expect(serializeNode(link, context())).toMatchObject({
      type: "Element",
      tagName: "style",
      attributes: {},
      childNodes: [{ type: "Text", textContent: "body{margin:0}" }],
    });
  });

  it("keeps a cross-origin stylesheet link and resolves its href", () => {
    const doc = documentWithBase();
    const link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "https://cdn.example/other.css");
    doc.head.append(link);
    installSheets(doc, [
      {
        href: "https://cdn.example/other.css",
        ownerNode: link,
        rules: null,
      },
    ]);

    expect(serializeNode(link, context())).toEqual({
      id: 1,
      type: "Element",
      tagName: "link",
      attributes: {
        rel: "stylesheet",
        href: "https://cdn.example/other.css",
      },
      childNodes: [],
    });
  });

  it("keeps style text and an unmatched link", () => {
    const doc = documentWithBase();
    const style = doc.createElement("style");
    style.textContent = ".a{color:red}";
    const link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "missing.css");
    doc.head.append(style, link);

    expect(serializeNode(style, context())).toMatchObject({
      type: "Element",
      tagName: "style",
      childNodes: [{ type: "Text", textContent: ".a{color:red}" }],
    });
    expect(serializeNode(link, context())).toMatchObject({
      type: "Element",
      tagName: "link",
      attributes: {
        rel: "stylesheet",
        href: "https://shop.example/app/missing.css",
      },
    });
  });
});
