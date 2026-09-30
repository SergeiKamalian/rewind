import { describe, expect, it } from "vitest";
import { version } from "./index.js";

describe("version", () => {
  it("returns session format version 1", () => {
    expect(version()).toBe(1);
  });
});
