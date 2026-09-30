import { describe, expect, it } from "vitest";
import { supportedFormatVersion } from "./index.js";

describe("@rewind/recorder", () => {
  it("imports the package entry", () => {
    expect(supportedFormatVersion()).toBe(1);
  });
});
