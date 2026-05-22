/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pdfmake", () => {
  return class MockPrinter {
    createPdfKitDocument() {
      const dataListeners: ((chunk: Buffer) => void)[] = [];
      const endListeners: (() => void)[] = [];
      return {
        on(event: string, callback: (...args: any[]) => void) {
          if (event === "data") {
            dataListeners.push(callback);
          }
          if (event === "end") {
            endListeners.push(callback);
          }
        },
        end() {
          dataListeners.forEach((listener) => listener(Buffer.from("chunk")));
          endListeners.forEach((listener) => listener());
        },
      };
    }
  };
});

vi.mock("pdfmake/build/vfs_fonts.js", () => ({
  pdfMake: {
    vfs: {
      "Roboto-Regular.ttf": "",
      "Roboto-Medium.ttf": "",
    },
  },
}));

const createMocks = (method: string, body?: Record<string, any>) => {
  const headers = new Map<string, string>();
  const res = {
    statusCode: 200,
    body: null as Buffer | string | null,
    headersSent: false,
    writableEnded: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase()) ?? null;
    },
    send(value: Buffer | string) {
      this.body = value;
      this.writableEnded = true;
      this.headersSent = true;
      return this;
    },
    end(value?: Buffer | string) {
      if (value !== undefined) {
        this.body = value;
      }
      this.writableEnded = true;
      this.headersSent = true;
      return this;
    },
  };
  const req = { method, body: body ?? {} } as NextApiRequest;
  return { req, res, headers };
};

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("DocuFit PDF API", () => {
  let handler: (req: any, res: any) => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/pages/api/docufit/pdf");
    handler = mod.default as any;
  });

  it("responds with PDF headers and data", async () => {
    const { req, res } = createMocks("POST", { rows: [] });
    await handler(req, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.getHeader("content-type")).toBe("application/pdf");
    expect(res.getHeader("content-disposition")).toContain("docufit-measurements");
    expect(res.body).toBeInstanceOf(Buffer);
  });

  it("rejects non-POST methods", async () => {
    const { req, res } = createMocks("GET");
    await handler(req, res as any);
    expect(res.statusCode).toBe(405);
  });
});
