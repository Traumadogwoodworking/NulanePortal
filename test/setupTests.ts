import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { server } from "./utils/mockServer";

expect.extend({
  toHaveNoViolations(results: { violations?: unknown[] }) {
    const violations = Array.isArray(results?.violations) ? results.violations : [];
    return {
      pass: violations.length === 0,
      message: () => `Expected no accessibility violations, found ${violations.length}.`,
    };
  },
});

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value.toString());
    },
  };
}

if (typeof window !== "undefined") {
  if (!window.localStorage) {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorageMock(),
    });
  }
  if (!window.sessionStorage) {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createStorageMock(),
    });
  }
}

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



