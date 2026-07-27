import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * CI guard — fails the test suite if the TypeScript build produces errors.
 * This catches regressions like the previous `show_on_homepage` issue where a
 * removed column was still referenced in components.
 */
describe("typecheck (CI guard)", () => {
  it("compiles the app with no TypeScript errors", () => {
    try {
      execSync("npx tsc --noEmit -p tsconfig.app.json", {
        stdio: "pipe",
        encoding: "utf8",
      });
    } catch (err: any) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect.fail("TypeScript errors found:\n" + output);
    }
    expect(true).toBe(true);
  }, 120_000);
});