import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FORMAT_VERSION, parseEvent, type RewindEvent } from "./index.js";

const architecturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/ARCHITECTURE.md",
);

/**
 * Reads the example session from the Session format section.
 * The JSON fence in that section is the fixture, so the doc cannot drift.
 */
function loadExampleSession(): unknown[] {
  const markdown = readFileSync(architecturePath, "utf8");
  const section = markdown.split(/^## Session format\s*$/m)[1];
  expect(section, "Session format section").toBeDefined();
  const fence = section?.match(/```json\r?\n([\s\S]*?)\r?\n```/);
  const source = fence?.[1];
  expect(source, "json example").toBeDefined();
  const parsed: unknown = JSON.parse(source ?? "");
  expect(Array.isArray(parsed)).toBe(true);
  return Array.isArray(parsed) ? parsed : [];
}

describe("example session", () => {
  it("parses every event in the architecture doc", () => {
    const events = loadExampleSession();
    const parsed: RewindEvent[] = [];

    for (const event of events) {
      const result = parseEvent(event);
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (result.ok) {
        parsed.push(result.value);
      }
    }

    expect(parsed.map((event) => event.type)).toEqual([
      "meta",
      "full_snapshot",
      "mouse_interaction",
      "mutation",
      "network",
    ]);

    const meta = parsed[0];
    if (meta?.type === "meta") {
      expect(meta.data.version).toBe(FORMAT_VERSION);
    }

    const click = parsed[2];
    if (click?.type === "mouse_interaction") {
      expect(click.data.interaction).toBe("click");
    }

    for (let index = 1; index < parsed.length; index += 1) {
      const previous = parsed[index - 1]?.seq ?? 0;
      const current = parsed[index]?.seq ?? 0;
      expect(current).toBeGreaterThan(previous);
    }
  });
});
