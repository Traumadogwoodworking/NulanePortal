import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { toHaveNoViolations } from "vitest-axe/dist/matchers.js";
import { server } from "./utils/mockServer";

expect.extend({ toHaveNoViolations });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const noop2D = () =>
  ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: [] }),
  putImageData: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  fillText: () => {},
  measureText: () => ({ width: 0 }),
  setLineDash: () => {},
  getContextAttributes: () => ({}),
} as unknown as CanvasRenderingContext2D);

HTMLCanvasElement.prototype.getContext = (() => noop2D()) as unknown as HTMLCanvasElement["getContext"];



