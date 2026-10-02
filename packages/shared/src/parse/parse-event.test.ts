import { describe, expect, it } from "vitest";
import {
  CONSOLE_LEVELS,
  ERROR_KINDS,
  type ErrorEvent,
  EVENT_TYPES,
  type EventType,
  type FullSnapshotEvent,
  type InputEvent,
  type MetaEvent,
  MOUSE_INTERACTIONS,
  type MouseInteractionEvent,
  type MouseMoveEvent,
  type MutationEvent,
  type NetworkEvent,
  parseEvent,
  type RewindEvent,
  type ScrollEvent,
  type ViewportResizeEvent,
} from "../index.js";

function oneOf(values: readonly string[]): string {
  return `expected one of ${values.join(", ")}`;
}

function expectFailure(input: unknown, path: string, message?: string): void {
  expect(() => parseEvent(input)).not.toThrow();
  const result = parseEvent(input);
  expect(result.ok).toBe(false);
  if (result.ok) {
    return;
  }
  expect(result.error.path).toBe(path);
  if (message === undefined) {
    expect(result.error.message.length).toBeGreaterThan(0);
    return;
  }
  expect(result.error.message).toBe(message);
}

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
  seq: 1,
  timestamp: 0,
  data: {
    node: {
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
          attributes: { lang: "en", hidden: true },
          childNodes: [
            { id: 4, type: "Text", textContent: "hi" },
            { id: 5, type: "Comment", textContent: "c" },
            { id: 6, type: "CDATA", textContent: "d" },
            {
              id: 7,
              type: "Element",
              tagName: "svg",
              attributes: { viewBox: "0 0 1 1" },
              isSVG: true,
              childNodes: [],
            },
          ],
        },
      ],
    },
  },
} satisfies FullSnapshotEvent;

const mutation = {
  type: "mutation",
  seq: 1,
  timestamp: 0,
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
  seq: 1,
  timestamp: 0,
  data: {
    positions: [
      { x: 1, y: 2, timeOffset: 0 },
      { x: 3, y: 4, timeOffset: 16 },
    ],
  },
} satisfies MouseMoveEvent;

const click = {
  type: "mouse_interaction",
  seq: 1,
  timestamp: 0,
  data: { interaction: "click", id: 2, x: 10, y: 12 },
} satisfies MouseInteractionEvent;

const scroll = {
  type: "scroll",
  seq: 1,
  timestamp: 0,
  data: { id: 1, x: 0, y: 40 },
} satisfies ScrollEvent;

const input = {
  type: "input",
  seq: 1,
  timestamp: 0,
  data: { id: 5, kind: "value", value: "secret", masked: true },
} satisfies InputEvent;

const checkedInput = {
  type: "input",
  seq: 1,
  timestamp: 0,
  data: { id: 6, kind: "checked", checked: true, masked: false },
} satisfies InputEvent;

const resize = {
  type: "viewport_resize",
  seq: 1,
  timestamp: 0,
  data: { width: 1024, height: 768 },
} satisfies ViewportResizeEvent;

const network = {
  type: "network",
  seq: 1,
  timestamp: 0,
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
  seq: 1,
  timestamp: 0,
  data: {
    level: "error",
    args: ["nope", 1, false, null, ["a"], { ok: true }],
    stack: null,
  },
} satisfies RewindEvent;

const failure = {
  type: "error",
  seq: 1,
  timestamp: 0,
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
  seq: 1,
  timestamp: 0,
  data: { tag: "checkout", payload: { step: 1, flags: [true, null] } },
} satisfies RewindEvent;

const validEvents: ReadonlyArray<readonly [EventType, RewindEvent]> = [
  ["meta", meta],
  ["full_snapshot", snapshot],
  ["mutation", mutation],
  ["mouse_move", mouseMove],
  ["mouse_interaction", click],
  ["scroll", scroll],
  ["input", input],
  ["viewport_resize", resize],
  ["network", network],
  ["console", consoleEvent],
  ["error", failure],
  ["custom", custom],
];

const invalidEvents: ReadonlyArray<{
  type: EventType;
  input: unknown;
  path: string;
  message: string;
}> = [
  {
    type: "meta",
    input: {
      ...meta,
      data: {
        ...meta.data,
        viewport: { width: "800", height: 600 },
      },
    },
    path: "data.viewport.width",
    message: "expected a finite number",
  },
  {
    type: "full_snapshot",
    input: {
      ...snapshot,
      data: { node: { id: 1, type: "Text", textContent: "hi" } },
    },
    path: "data.node.type",
    message: "expected Document",
  },
  {
    type: "mutation",
    input: {
      ...mutation,
      data: {
        ...mutation.data,
        texts: [{ id: 4, value: 1 }],
      },
    },
    path: "data.texts[0].value",
    message: "expected a string",
  },
  {
    type: "mouse_move",
    input: {
      ...mouseMove,
      data: { positions: [{ x: 1, y: 2 }] },
    },
    path: "data.positions[0].timeOffset",
    message: "expected a finite number",
  },
  {
    type: "mouse_interaction",
    input: {
      ...click,
      data: { ...click.data, interaction: "hover" },
    },
    path: "data.interaction",
    message: oneOf(MOUSE_INTERACTIONS),
  },
  {
    type: "scroll",
    input: { ...scroll, data: { ...scroll.data, id: "1" } },
    path: "data.id",
    message: "expected a finite number",
  },
  {
    type: "input",
    input: {
      ...input,
      data: { id: 5, kind: "value", masked: true },
    },
    path: "data.value",
    message: "expected a string",
  },
  {
    type: "viewport_resize",
    input: { ...resize, data: { width: 800 } },
    path: "data.height",
    message: "expected a finite number",
  },
  {
    type: "network",
    input: { ...network, data: { ...network.data, status: "200" } },
    path: "data.status",
    message: "expected a finite number or null",
  },
  {
    type: "console",
    input: {
      ...consoleEvent,
      data: { ...consoleEvent.data, level: "debug" },
    },
    path: "data.level",
    message: oneOf(CONSOLE_LEVELS),
  },
  {
    type: "error",
    input: { ...failure, data: { ...failure.data, kind: "exception" } },
    path: "data.kind",
    message: oneOf(ERROR_KINDS),
  },
  {
    type: "custom",
    input: {
      ...custom,
      data: { tag: "checkout", payload: () => 1 },
    },
    path: "data.payload",
    message: "expected a JSON value",
  },
];

describe("parseEvent", () => {
  it.each(validEvents)("accepts a valid %s event", (type, event) => {
    expect(event.type).toBe(type);
    expect(() => parseEvent(event)).not.toThrow();
    expect(parseEvent(event)).toEqual({ ok: true, value: event });
  });

  it("accepts a checked input", () => {
    expect(parseEvent(checkedInput)).toEqual({
      ok: true,
      value: checkedInput,
    });
  });

  it.each(MOUSE_INTERACTIONS)("accepts mouse interaction %s", (interaction) => {
    const event = {
      type: "mouse_interaction",
      seq: 1,
      timestamp: 0,
      data: { interaction, id: 1, x: 0, y: 0 },
    } satisfies MouseInteractionEvent;
    expect(parseEvent(event)).toEqual({ ok: true, value: event });
  });

  it.each(CONSOLE_LEVELS)("accepts console level %s", (level) => {
    const event = {
      ...consoleEvent,
      data: { ...consoleEvent.data, level },
    };
    expect(parseEvent(event)).toEqual({ ok: true, value: event });
  });

  it.each(ERROR_KINDS)("accepts error kind %s", (kind) => {
    const event = { ...failure, data: { ...failure.data, kind } };
    expect(parseEvent(event)).toEqual({ ok: true, value: event });
  });

  it.each(invalidEvents)(
    "rejects an invalid $type event",
    ({ input: value, path, message }) => {
      expectFailure(value, path, message);
    },
  );

  it("does not throw for null, a number, a string, or a random object", () => {
    for (const value of [null, 1, "event"]) {
      expect(() => parseEvent(value)).not.toThrow();
      expect(parseEvent(value)).toEqual({
        ok: false,
        error: { path: "", message: "expected an object" },
      });
    }

    const random = { hello: "world" };
    expect(() => parseEvent(random)).not.toThrow();
    expect(parseEvent(random)).toEqual({
      ok: false,
      error: { path: "type", message: oneOf(EVENT_TYPES) },
    });
  });

  it("rejects an unknown field with its path", () => {
    expectFailure(
      {
        ...scroll,
        data: { ...scroll.data, z: 1 },
      },
      "data.z",
      "unknown field z",
    );
    expectFailure({ ...scroll, extra: true }, "extra", "unknown field extra");
  });

  it("rejects a boolean attribute stored as false", () => {
    expectFailure(
      {
        ...snapshot,
        data: {
          node: {
            ...snapshot.data.node,
            childNodes: [
              snapshot.data.node.childNodes[0],
              {
                ...snapshot.data.node.childNodes[1],
                attributes: { hidden: false },
              },
            ],
          },
        },
      },
      "data.node.childNodes[1].attributes.hidden",
      "expected a string or true",
    );
  });

  it("rejects a non-finite sequence number", () => {
    expectFailure(
      { ...scroll, seq: Number.NaN },
      "seq",
      "expected a finite number",
    );
  });

  it("rejects a circular payload without throwing", () => {
    const payload: Record<string, unknown> = { ok: true };
    payload.self = payload;
    expectFailure(
      {
        type: "custom",
        seq: 1,
        timestamp: 0,
        data: { tag: "loop", payload },
      },
      "data.payload.self",
      "circular value",
    );
  });

  it("rejects a circular DOM node without throwing", () => {
    const node: Record<string, unknown> = {
      id: 2,
      type: "Element",
      tagName: "div",
      attributes: {},
      childNodes: [],
    };
    node.childNodes = [node];
    expectFailure(
      {
        type: "full_snapshot",
        seq: 1,
        timestamp: 0,
        data: {
          node: { id: 1, type: "Document", childNodes: [node] },
        },
      },
      "data.node.childNodes[0].childNodes[0]",
      "circular value",
    );
  });

  it("accepts a DOM tree 30 levels deep and rejects 300", () => {
    expect(parseEvent(deepSnapshot(30))).toMatchObject({ ok: true });

    expect(() => parseEvent(deepSnapshot(300))).not.toThrow();
    const result = parseEvent(deepSnapshot(300));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("depth");
    }
  });

  it("does not throw when a property getter throws", () => {
    const value = {
      get type(): string {
        throw new Error("boom");
      },
    };
    expect(() => parseEvent(value)).not.toThrow();
    const result = parseEvent(value);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("boom");
    }
  });
});

function deepSnapshot(depth: number): unknown {
  let child: unknown = { id: depth, type: "Text", textContent: "end" };
  for (let id = depth - 1; id >= 1; id -= 1) {
    child = {
      id,
      type: "Element",
      tagName: "div",
      attributes: {},
      childNodes: [child],
    };
  }
  return {
    type: "full_snapshot",
    seq: 1,
    timestamp: 0,
    data: {
      node: { id: 0, type: "Document", childNodes: [child] },
    },
  };
}
