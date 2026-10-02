import { describe, expect, it } from "vitest";
import { Player } from "./index.js";

describe("@rewind/player", () => {
  it("imports the package entry", () => {
    expect(typeof Player).toBe("function");
  });
});
