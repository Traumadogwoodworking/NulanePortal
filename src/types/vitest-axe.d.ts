import type { NoViolationsMatcherResult } from "vitest-axe/dist/to-have-no-violations-e1679411";

declare module "vitest-axe" {
  export function toHaveNoViolations(received: unknown): NoViolationsMatcherResult;
}

declare module "vitest" {
  interface Assertion {
    toHaveNoViolations(): NoViolationsMatcherResult;
  }
}
