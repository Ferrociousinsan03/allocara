import { describe, expect, it } from "vitest";
import { runEngineSelfTests } from "./selftest";

describe("engine self-tests", () => {
  it("all sanity checks pass", () => {
    expect(runEngineSelfTests()).toEqual([]);
  });
});
