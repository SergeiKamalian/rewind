import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type Clock,
  createEvent,
  FORMAT_VERSION,
  type InputEvent,
  isEventOfType,
  parseEvent,
  type RewindEvent,
  type ScrollEvent,
  version,
} from "./index.js";

function frozenClock(timestamp: number): Clock {
  return { now: () => timestamp };
}

describe("FORMAT_VERSION", () => {
  it("is the value version() returns", () => {
    expect(FORMAT_VERSION).toBe(1);
    expect(version()).toBe(FORMAT_VERSION);
  });
});

describe("createEvent", () => {
  it("fills type, data, seq, and timestamp from the clock", () => {
    const data = { id: 1, x: 2, y: 3 };
    const event = createEvent("scroll", data, frozenClock(40));

    expect(event).toEqual({
      type: "scroll",
      seq: 1,
      timestamp: 40,
      data,
    });
    expect(event.data).toBe(data);
    expectTypeOf(event).toEqualTypeOf<ScrollEvent>();
  });

  it("keeps an input kind on the returned event", () => {
    const event = createEvent(
      "input",
      { id: 5, kind: "checked", checked: true, masked: false },
      frozenClock(0),
    );

    expect(event.data.kind).toBe("checked");
    expectTypeOf(event).toEqualTypeOf<InputEvent>();
  });

  it("builds an event parseEvent accepts", () => {
    const event = createEvent(
      "custom",
      { tag: "checkout", payload: { ok: true } },
      frozenClock(8),
    );

    expect(parseEvent(event)).toEqual({ ok: true, value: event });
  });

  it("gives 1000 events in the same millisecond strictly increasing seq", () => {
    const clock = frozenClock(15);
    const seqs: number[] = [];

    for (let index = 0; index < 1000; index += 1) {
      const event = createEvent("custom", { tag: "n", payload: index }, clock);
      expect(event.timestamp).toBe(15);
      seqs.push(event.seq);
    }

    expect(seqs).toEqual(Array.from({ length: 1000 }, (_, index) => index + 1));
  });

  it("counts seq separately for each clock", () => {
    const clockA = frozenClock(0);
    const clockB = frozenClock(0);
    const first = createEvent("custom", { tag: "a", payload: null }, clockA);
    const other = createEvent("custom", { tag: "b", payload: null }, clockB);
    const second = createEvent("custom", { tag: "a", payload: null }, clockA);

    expect(first.seq).toBe(1);
    expect(other.seq).toBe(1);
    expect(second.seq).toBe(2);
  });

  it("follows a clock that moves while seq keeps increasing", () => {
    let timestamp = 10;
    const clock: Clock = { now: () => timestamp };
    const first = createEvent("custom", { tag: "t", payload: null }, clock);
    timestamp = 25;
    const second = createEvent("custom", { tag: "t", payload: null }, clock);

    expect(first.timestamp).toBe(10);
    expect(second.timestamp).toBe(25);
    expect(second.seq).toBe(first.seq + 1);
  });
});

describe("isEventOfType", () => {
  const scroll: RewindEvent = {
    type: "scroll",
    seq: 1,
    timestamp: 0,
    data: { id: 1, x: 0, y: 4 },
  };

  it("accepts the matching kind and rejects another", () => {
    expect(isEventOfType(scroll, "scroll")).toBe(true);
    expect(isEventOfType(scroll, "input")).toBe(false);
  });

  it("narrows data to the requested kind", () => {
    if (isEventOfType(scroll, "scroll")) {
      expectTypeOf(scroll).toEqualTypeOf<ScrollEvent>();
      expect(scroll.data.y).toBe(4);
    }
  });
});
