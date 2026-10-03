import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type BaseEvent,
  type CDATANode,
  type CommentNode,
  type DoctypeNode,
  type DocumentNode,
  type ElementNode,
  EVENT_TYPES,
  type EventType,
  SERIALIZED_NODE_TYPES,
  type SerializedNode,
  type TextNode,
} from "../index.js";

const EVENT_KINDS = [
  "meta",
  "full_snapshot",
  "mutation",
  "mouse_move",
  "mouse_interaction",
  "scroll",
  "input",
  "viewport_resize",
  "network",
  "console",
  "error",
  "custom",
] as const;

const NODE_KINDS = [
  "Document",
  "Doctype",
  "Element",
  "Text",
  "Comment",
  "CDATA",
] as const;

describe("EventType", () => {
  it("lists every session event kind in canonical order", () => {
    expect(EVENT_TYPES).toEqual([...EVENT_KINDS]);
    expectTypeOf(EVENT_TYPES).toEqualTypeOf<typeof EVENT_KINDS>();
  });

  it("matches the canonical event kind union", () => {
    expectTypeOf<EventType>().toEqualTypeOf<(typeof EVENT_KINDS)[number]>();
  });

  it("rejects an unknown event kind", () => {
    function assertEventType<T extends EventType>(_type: T): void {}

    // @ts-expect-error "not-an-event" is not an EventType
    assertEventType("not-an-event");
  });
});

describe("BaseEvent", () => {
  it("has type, seq, timestamp, and data", () => {
    expectTypeOf<BaseEvent<"meta", { version: number }>>().toEqualTypeOf<{
      type: "meta";
      seq: number;
      timestamp: number;
      data: { version: number };
    }>();
  });

  it("uses only the envelope keys", () => {
    expectTypeOf<keyof BaseEvent<"custom", null>>().toEqualTypeOf<
      "type" | "seq" | "timestamp" | "data"
    >();
  });

  it("keeps seq and timestamp on a constructed event", () => {
    const event: BaseEvent<"meta", { version: number }> = {
      type: "meta",
      seq: 1,
      timestamp: 0,
      data: { version: 1 },
    };

    expect(event).toEqual({
      type: "meta",
      seq: 1,
      timestamp: 0,
      data: { version: 1 },
    });
  });
});

describe("serialized DOM nodes", () => {
  it("lists every node kind in canonical order", () => {
    expect(SERIALIZED_NODE_TYPES).toEqual([...NODE_KINDS]);
    expectTypeOf(SERIALIZED_NODE_TYPES).toEqualTypeOf<typeof NODE_KINDS>();
  });

  it("is a union of the six node interfaces", () => {
    expectTypeOf<SerializedNode>().toEqualTypeOf<
      | DocumentNode
      | DoctypeNode
      | ElementNode
      | TextNode
      | CommentNode
      | CDATANode
    >();
  });

  it("gives every node a numeric id", () => {
    expectTypeOf<DocumentNode["id"]>().toBeNumber();
    expectTypeOf<DoctypeNode["id"]>().toBeNumber();
    expectTypeOf<ElementNode["id"]>().toBeNumber();
    expectTypeOf<TextNode["id"]>().toBeNumber();
    expectTypeOf<CommentNode["id"]>().toBeNumber();
    expectTypeOf<CDATANode["id"]>().toBeNumber();
  });

  it("requires id on an element", () => {
    // @ts-expect-error id is required on every serialized node
    const missingId: ElementNode = {
      type: "Element",
      tagName: "div",
      attributes: {},
      childNodes: [],
    };
    expect(missingId).toBeDefined();
  });

  it("describes a document and a doctype", () => {
    expectTypeOf<DocumentNode["type"]>().toEqualTypeOf<"Document">();
    expectTypeOf<DocumentNode["childNodes"]>().toEqualTypeOf<
      SerializedNode[]
    >();
    expectTypeOf<DoctypeNode["type"]>().toEqualTypeOf<"Doctype">();
    expectTypeOf<DoctypeNode["name"]>().toBeString();
    expectTypeOf<DoctypeNode["publicId"]>().toBeString();
    expectTypeOf<DoctypeNode["systemId"]>().toBeString();
  });

  it("describes element fields from the session format", () => {
    expectTypeOf<ElementNode["tagName"]>().toBeString();
    expectTypeOf<ElementNode["attributes"]>().toEqualTypeOf<
      Record<string, string | true>
    >();
    expectTypeOf<ElementNode["childNodes"]>().toEqualTypeOf<SerializedNode[]>();
    expectTypeOf<ElementNode["isSVG"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ElementNode["isShadowRoot"]>().toEqualTypeOf<
      boolean | undefined
    >();
  });

  it("stores text, comments, and CDATA as leaves", () => {
    expectTypeOf<TextNode["textContent"]>().toBeString();
    expectTypeOf<CommentNode["textContent"]>().toBeString();
    expectTypeOf<CDATANode["textContent"]>().toBeString();
    expectTypeOf<TextNode>().not.toHaveProperty("childNodes");
    expectTypeOf<CommentNode>().not.toHaveProperty("childNodes");
    expectTypeOf<CDATANode>().not.toHaveProperty("childNodes");
    expectTypeOf<DoctypeNode>().not.toHaveProperty("childNodes");
  });

  it("narrows on node.type", () => {
    const tagName = (node: SerializedNode): string | undefined => {
      if (node.type === "Element") {
        expectTypeOf(node).toEqualTypeOf<ElementNode>();
        return node.tagName;
      }
      return undefined;
    };

    expectTypeOf(tagName).returns.toEqualTypeOf<string | undefined>();
  });

  it("stores boolean attributes as true", () => {
    const input: ElementNode = {
      id: 4,
      type: "Element",
      tagName: "input",
      attributes: { disabled: true, type: "text" },
      childNodes: [],
    };

    expect(input.attributes.disabled).toBe(true);
    expect(input.attributes.type).toBe("text");
    expect(input.isSVG).toBeUndefined();
  });
});
