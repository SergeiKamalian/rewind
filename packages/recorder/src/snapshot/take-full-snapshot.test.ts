import type { Clock, SerializedNode } from "@rewind/shared";
import { parseEvent } from "@rewind/shared";
import { describe, expect, it } from "vitest";
import { Mirror } from "../mirror.js";
import {
  type SnapshotContext,
  takeFullSnapshot,
} from "./take-full-snapshot.js";

const PAGE = "https://shop.example/app/index.html";
const PASSWORD = "p@ss-snapshot-9";
const SCRIPT = "window.__snapshotSecret = 1;";
const CLICK = "snapshotHack()";
const CHOSEN = "dx-9";

function clock(now: number): Clock {
  return { now: () => now };
}

function context(now: number): SnapshotContext {
  return { mirror: new Mirror(), clock: clock(now) };
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

function urlAttributes(output: string): string[] {
  const values: string[] = [];
  const pattern = /"(?:src|href|srcset)":"((?:\\.|[^"\\])*)"/g;
  for (const match of output.matchAll(pattern)) {
    const raw = match[1];
    if (raw === undefined) {
      continue;
    }
    values.push(JSON.parse(`"${raw}"`) as string);
  }
  return values;
}

function assertNoRelativeUrl(output: string): void {
  const values = urlAttributes(output);
  expect(values.length).toBeGreaterThan(0);
  for (const value of values) {
    for (const candidate of value.split(",")) {
      const url = candidate.trim().split(/\s+/)[0] ?? "";
      if (url === "" || url.startsWith("#")) {
        continue;
      }
      expect(url).toMatch(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i);
    }
  }
}

function shopPage(): Document {
  const doc = document.implementation.createHTMLDocument("Shop");
  const base = doc.createElement("base");
  base.href = PAGE;
  doc.head.append(base);

  const header = doc.createElement("header");
  const heading = doc.createElement("h1");
  heading.textContent = "Shop";
  header.append(heading);

  const form = doc.createElement("form");
  const password = doc.createElement("input");
  password.type = "password";
  password.name = "password";
  password.value = PASSWORD;
  password.setAttribute("value", PASSWORD);
  const select = doc.createElement("select");
  select.setAttribute("value", CHOSEN);
  const apple = doc.createElement("option");
  apple.value = "apple";
  apple.textContent = "Apple";
  const chosen = doc.createElement("option");
  chosen.value = CHOSEN;
  chosen.textContent = "Diagnosis";
  select.append(apple, chosen);
  select.value = CHOSEN;
  form.append(password, select);

  const list = doc.createElement("ul");
  for (const label of ["One", "Two"]) {
    const item = doc.createElement("li");
    item.textContent = label;
    list.append(item);
  }

  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  const circle = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  svg.append(circle);

  const host = doc.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const inside = doc.createElement("span");
  inside.textContent = "inside";
  shadow.append(inside);

  const script = doc.createElement("script");
  script.setAttribute("onclick", CLICK);
  script.textContent = SCRIPT;

  const logo = doc.createElement("img");
  logo.setAttribute("src", "../assets/logo.png");
  logo.setAttribute("srcset", "../small.png 1x, /large.png 2x");
  const guide = doc.createElement("a");
  guide.setAttribute("href", "../docs/guide.html");
  guide.textContent = "Guide";

  doc.body.append(header, form, list, svg, host, script, logo, guide);
  return doc;
}

describe("takeFullSnapshot", () => {
  it("returns a full_snapshot event that parseEvent accepts", () => {
    const doc = document.implementation.createHTMLDocument("Hi");
    const event = takeFullSnapshot(doc, context(25));

    expect(event.type).toBe("full_snapshot");
    expect(event.seq).toBe(1);
    expect(event.timestamp).toBe(25);
    expect(event.data.node.type).toBe("Document");
    expect(parseEvent(event)).toMatchObject({ ok: true });
  });

  it("snapshots a page twice with stable unique ids", () => {
    const doc = shopPage();
    const ctx: SnapshotContext = { mirror: new Mirror(), clock: clock(0) };
    const first = takeFullSnapshot(doc, ctx);
    const second = takeFullSnapshot(doc, ctx);
    const output = JSON.stringify(first);

    expect(parseEvent(first)).toMatchObject({ ok: true });
    expect(parseEvent(second)).toMatchObject({ ok: true });
    const ids = idsOf(first.data.node);
    expect(new Set(ids).size).toBe(ids.length);
    expect(idsOf(second.data.node)).toEqual(ids);
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain(SCRIPT);
    expect(output).not.toContain(CLICK);
    expect(output).not.toContain(CHOSEN);
    expect(output).not.toMatch(/"on[a-zA-Z]+":/);
    assertNoRelativeUrl(output);
  });
});
