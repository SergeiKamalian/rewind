import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CONSOLE_LEVELS,
  type ConsoleEvent,
  type ConsoleEventData,
  type ConsoleLevel,
  type CustomEvent,
  type CustomEventData,
  ERROR_KINDS,
  type ErrorEvent,
  type ErrorEventData,
  type ErrorKind,
  type EventDataMap,
  type EventType,
  type FullSnapshotEvent,
  type FullSnapshotEventData,
  type InputCheckedData,
  type InputEvent,
  type InputEventData,
  type InputValueData,
  type JsonValue,
  type MetaEvent,
  type MetaEventData,
  MOUSE_INTERACTIONS,
  type MouseInteractionEvent,
  type MouseInteractionEventData,
  type MouseInteractionKind,
  type MouseMoveEvent,
  type MouseMoveEventData,
  type MousePosition,
  type MutationAdd,
  type MutationAttribute,
  type MutationEvent,
  type MutationEventData,
  type MutationRemove,
  type MutationText,
  type NetworkEvent,
  type NetworkEventData,
  type RewindEvent,
  type ScrollEvent,
  type ScrollEventData,
  type ViewportResizeEvent,
  type ViewportSize,
} from "../index.js";

const MOUSE_INTERACTION_KINDS = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "focus",
  "blur",
] as const;

const CONSOLE_LEVEL_KINDS = ["log", "info", "warn", "error"] as const;

const ERROR_KIND_KINDS = ["error", "unhandledrejection"] as const;

describe("RewindEvent", () => {
  it("covers every event kind", () => {
    expectTypeOf<RewindEvent["type"]>().toEqualTypeOf<EventType>();
    expectTypeOf<keyof EventDataMap>().toEqualTypeOf<EventType>();
  });

  it("is the union of the twelve event aliases", () => {
    expectTypeOf<RewindEvent>().toEqualTypeOf<
      | MetaEvent
      | FullSnapshotEvent
      | MutationEvent
      | MouseMoveEvent
      | MouseInteractionEvent
      | ScrollEvent
      | InputEvent
      | ViewportResizeEvent
      | NetworkEvent
      | ConsoleEvent
      | ErrorEvent
      | CustomEvent
    >();
  });

  it("narrows mutation data", () => {
    const adds = (event: RewindEvent): MutationAdd[] | undefined => {
      if (event.type !== "mutation") {
        return undefined;
      }
      expectTypeOf(event).toEqualTypeOf<MutationEvent>();
      expectTypeOf(event.data).toEqualTypeOf<MutationEventData>();
      return event.data.adds;
    };

    expectTypeOf(adds).returns.toEqualTypeOf<MutationAdd[] | undefined>();
  });

  it("narrows network data", () => {
    const requestId = (event: RewindEvent): string | undefined => {
      if (event.type !== "network") {
        return undefined;
      }
      expectTypeOf(event).toEqualTypeOf<NetworkEvent>();
      expectTypeOf(event.data).toEqualTypeOf<NetworkEventData>();
      return event.data.requestId;
    };

    expectTypeOf(requestId).returns.toEqualTypeOf<string | undefined>();
  });

  it("narrows input data", () => {
    const text = (event: RewindEvent): string | undefined => {
      if (event.type !== "input") {
        return undefined;
      }
      if (event.data.kind !== "value") {
        expectTypeOf(event.data).toEqualTypeOf<InputCheckedData>();
        return undefined;
      }
      expectTypeOf(event.data).toEqualTypeOf<InputValueData>();
      return event.data.value;
    };

    expectTypeOf(text).returns.toEqualTypeOf<string | undefined>();
  });

  it("reads every payload from the discriminant", () => {
    const label = (event: RewindEvent): string => {
      switch (event.type) {
        case "meta":
          return event.data.sessionId;
        case "full_snapshot":
          return event.data.node.type;
        case "mutation":
          return String(event.data.adds.length);
        case "mouse_move":
          return String(event.data.positions.length);
        case "mouse_interaction":
          return event.data.interaction;
        case "scroll":
          return String(event.data.id);
        case "input":
          return event.data.kind === "value"
            ? event.data.value
            : String(event.data.checked);
        case "viewport_resize":
          return String(event.data.width);
        case "network":
          return event.data.requestId;
        case "console":
          return event.data.level;
        case "error":
          return event.data.kind;
        case "custom":
          return event.data.tag;
      }
    };

    expectTypeOf(label).returns.toBeString();
  });

  it("rejects a payload that belongs to another kind", () => {
    function acceptsScroll(data: ScrollEventData): void {
      void data;
    }

    // @ts-expect-error scroll data is id, x, and y
    acceptsScroll({ width: 800, height: 600 });
  });
});

describe("event payloads", () => {
  it("describes meta and the viewport", () => {
    expectTypeOf<MetaEventData["version"]>().toBeNumber();
    expectTypeOf<MetaEventData["sessionId"]>().toBeString();
    expectTypeOf<MetaEventData["startTime"]>().toBeNumber();
    expectTypeOf<MetaEventData["url"]>().toBeString();
    expectTypeOf<MetaEventData["userAgent"]>().toBeString();
    expectTypeOf<MetaEventData["viewport"]>().toEqualTypeOf<ViewportSize>();
    expectTypeOf<ViewportSize>().toEqualTypeOf<{
      width: number;
      height: number;
    }>();
  });

  it("stores a document as the full snapshot", () => {
    expectTypeOf<
      FullSnapshotEventData["node"]["type"]
    >().toEqualTypeOf<"Document">();

    function acceptsSnapshot(data: FullSnapshotEventData): void {
      void data;
    }

    acceptsSnapshot({
      // @ts-expect-error a full snapshot root is a document
      node: { id: 1, type: "Text", textContent: "hi" },
    });
  });

  it("describes mutation adds, removes, attributes, and text", () => {
    expectTypeOf<keyof MutationEventData>().toEqualTypeOf<
      "adds" | "removes" | "attributes" | "texts"
    >();
    expectTypeOf<MutationAdd>().toEqualTypeOf<{
      parentId: number;
      nextId: number | null;
      node: MutationAdd["node"];
    }>();
    expectTypeOf<MutationRemove>().toEqualTypeOf<{
      parentId: number;
      id: number;
    }>();
    expectTypeOf<MutationAttribute["value"]>().toEqualTypeOf<
      string | true | null
    >();
    expectTypeOf<MutationText>().toEqualTypeOf<{ id: number; value: string }>();
  });

  it("batches mouse positions with time offsets", () => {
    expectTypeOf<MouseMoveEventData["positions"]>().toEqualTypeOf<
      MousePosition[]
    >();
    expectTypeOf<MousePosition>().toEqualTypeOf<{
      x: number;
      y: number;
      timeOffset: number;
    }>();
  });

  it("lists mouse interactions in canonical order", () => {
    expect(MOUSE_INTERACTIONS).toEqual([...MOUSE_INTERACTION_KINDS]);
  });

  it("types each mouse interaction", () => {
    expectTypeOf<MouseInteractionKind>().toEqualTypeOf<
      (typeof MOUSE_INTERACTION_KINDS)[number]
    >();
    expectTypeOf<keyof MouseInteractionEventData>().toEqualTypeOf<
      "interaction" | "id" | "x" | "y"
    >();
  });

  it("describes scroll and viewport resize", () => {
    expectTypeOf<ScrollEventData>().toEqualTypeOf<{
      id: number;
      x: number;
      y: number;
    }>();
    expectTypeOf<ViewportResizeEvent["data"]>().toEqualTypeOf<ViewportSize>();
  });

  it("splits input into text value or checked", () => {
    expectTypeOf<InputEventData>().toEqualTypeOf<
      InputValueData | InputCheckedData
    >();
    expectTypeOf<InputValueData>().not.toHaveProperty("checked");
    expectTypeOf<InputCheckedData>().not.toHaveProperty("value");
    expectTypeOf<InputValueData["masked"]>().toBeBoolean();
    expectTypeOf<InputCheckedData["masked"]>().toBeBoolean();

    function acceptsInput(data: InputEventData): void {
      void data;
    }

    acceptsInput({
      id: 1,
      kind: "value",
      value: "a",
      // @ts-expect-error a text input has no checked state
      checked: true,
      masked: false,
    });
  });

  it("keeps every network field, using null when absent", () => {
    expectTypeOf<keyof NetworkEventData>().toEqualTypeOf<
      | "requestId"
      | "method"
      | "url"
      | "status"
      | "start"
      | "end"
      | "requestSize"
      | "responseSize"
      | "error"
    >();
    expectTypeOf<NetworkEventData["status"]>().toEqualTypeOf<number | null>();
    expectTypeOf<NetworkEventData["end"]>().toEqualTypeOf<number | null>();
    expectTypeOf<NetworkEventData["requestSize"]>().toEqualTypeOf<
      number | null
    >();
    expectTypeOf<NetworkEventData["responseSize"]>().toEqualTypeOf<
      number | null
    >();
    expectTypeOf<NetworkEventData["error"]>().toEqualTypeOf<string | null>();
  });

  it("lists console levels in canonical order", () => {
    expect(CONSOLE_LEVELS).toEqual([...CONSOLE_LEVEL_KINDS]);
  });

  it("stores serialized console args and an optional stack", () => {
    expectTypeOf<ConsoleLevel>().toEqualTypeOf<
      (typeof CONSOLE_LEVEL_KINDS)[number]
    >();
    expectTypeOf<ConsoleEventData["args"]>().toEqualTypeOf<JsonValue[]>();
    expectTypeOf<ConsoleEventData["stack"]>().toEqualTypeOf<string | null>();

    function acceptsJson(value: JsonValue): void {
      void value;
    }

    // @ts-expect-error functions are not JSON
    acceptsJson(() => 1);
  });

  it("lists error kinds in canonical order", () => {
    expect(ERROR_KINDS).toEqual([...ERROR_KIND_KINDS]);
  });

  it("describes an error or an unhandled rejection", () => {
    expectTypeOf<ErrorKind>().toEqualTypeOf<
      (typeof ERROR_KIND_KINDS)[number]
    >();
    expectTypeOf<keyof ErrorEventData>().toEqualTypeOf<
      "message" | "stack" | "source" | "line" | "column" | "kind"
    >();
    expectTypeOf<ErrorEventData["stack"]>().toEqualTypeOf<string | null>();
    expectTypeOf<ErrorEventData["source"]>().toEqualTypeOf<string | null>();
    expectTypeOf<ErrorEventData["line"]>().toEqualTypeOf<number | null>();
    expectTypeOf<ErrorEventData["column"]>().toEqualTypeOf<number | null>();
  });

  it("describes a custom tag and a JSON payload", () => {
    expectTypeOf<CustomEventData>().toEqualTypeOf<{
      tag: string;
      payload: JsonValue;
    }>();
  });
});

describe("recorded events", () => {
  it("builds one event of each kind", () => {
    const meta = {
      type: "meta",
      seq: 1,
      timestamp: 0,
      data: {
        version: 1,
        sessionId: "session-1",
        startTime: 1_700_000_000_000,
        url: "https://example.test/checkout",
        userAgent: "test",
        viewport: { width: 800, height: 600 },
      },
    } satisfies MetaEvent;

    const snapshot = {
      type: "full_snapshot",
      seq: 2,
      timestamp: 1,
      data: {
        node: { id: 1, type: "Document", childNodes: [] },
      },
    } satisfies FullSnapshotEvent;

    const mutation = {
      type: "mutation",
      seq: 3,
      timestamp: 2,
      data: {
        adds: [
          {
            parentId: 1,
            nextId: null,
            node: {
              id: 2,
              type: "Element",
              tagName: "button",
              attributes: { disabled: true },
              childNodes: [],
            },
          },
        ],
        removes: [{ parentId: 1, id: 3 }],
        attributes: [{ id: 2, name: "disabled", value: null }],
        texts: [{ id: 4, value: "Pay" }],
      },
    } satisfies MutationEvent;

    const mouseMove = {
      type: "mouse_move",
      seq: 4,
      timestamp: 3,
      data: {
        positions: [
          { x: 1, y: 2, timeOffset: 0 },
          { x: 3, y: 4, timeOffset: 16 },
        ],
      },
    } satisfies MouseMoveEvent;

    const click = {
      type: "mouse_interaction",
      seq: 5,
      timestamp: 4,
      data: { interaction: "click", id: 2, x: 10, y: 12 },
    } satisfies MouseInteractionEvent;

    const scroll = {
      type: "scroll",
      seq: 6,
      timestamp: 5,
      data: { id: 1, x: 0, y: 40 },
    } satisfies ScrollEvent;

    const input = {
      type: "input",
      seq: 7,
      timestamp: 6,
      data: { id: 5, kind: "value", value: "secret", masked: true },
    } satisfies InputEvent;

    const resize = {
      type: "viewport_resize",
      seq: 8,
      timestamp: 7,
      data: { width: 1024, height: 768 },
    } satisfies ViewportResizeEvent;

    const network = {
      type: "network",
      seq: 9,
      timestamp: 8,
      data: {
        requestId: "req-1",
        method: "POST",
        url: "https://example.test/api",
        status: null,
        start: 8,
        end: null,
        requestSize: 12,
        responseSize: null,
        error: "failed",
      },
    } satisfies NetworkEvent;

    const consoleEvent = {
      type: "console",
      seq: 10,
      timestamp: 9,
      data: {
        level: "error",
        args: ["nope", 1, null, { ok: true }],
        stack: "Error: nope",
      },
    } satisfies ConsoleEvent;

    const failure = {
      type: "error",
      seq: 11,
      timestamp: 10,
      data: {
        message: "nope",
        stack: null,
        source: null,
        line: null,
        column: null,
        kind: "unhandledrejection",
      },
    } satisfies ErrorEvent;

    const custom = {
      type: "custom",
      seq: 12,
      timestamp: 11,
      data: { tag: "checkout", payload: { step: 1 } },
    } satisfies CustomEvent;

    const events: RewindEvent[] = [
      meta,
      snapshot,
      mutation,
      mouseMove,
      click,
      scroll,
      input,
      resize,
      network,
      consoleEvent,
      failure,
      custom,
    ];

    expect(events.map((event) => event.type)).toEqual([
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
    ]);
    expect(input.data.masked).toBe(true);
    expect(network.data.error).toBe("failed");
    expect(mutation.data.attributes[0]?.value).toBeNull();
  });
});
