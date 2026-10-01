import { expect, test } from "vitest";

test("jsdom provides document", () => {
  expect(typeof document !== "undefined").toBe(true);
});
