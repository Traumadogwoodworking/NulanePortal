import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseTrustedPortalPdfUrl,
  proxyPortalPdfDownload,
} from "@/portal/core/server/portalPdfProxy";

const signedPdf =
  "https://docudent-bucket.s3.us-east-2.amazonaws.com/orgs/org-1/vins/unassigned/captures/pdf/report.pdf?X-Amz-Credential=test&X-Amz-Signature=test";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("portal PDF proxy", () => {
  it("accepts only signed report PDFs from the DocuDent bucket", () => {
    expect(parseTrustedPortalPdfUrl(signedPdf)?.hostname).toBe("docudent-bucket.s3.us-east-2.amazonaws.com");
    expect(parseTrustedPortalPdfUrl(signedPdf.split("?")[0])).toBeNull();
    expect(parseTrustedPortalPdfUrl("https://attacker.example/orgs/org-1/captures/pdf/report.pdf?X-Amz-Credential=test&X-Amz-Signature=test")).toBeNull();
    expect(parseTrustedPortalPdfUrl("https://docudent-bucket.s3.us-east-2.amazonaws.com/orgs/org-1/captures/photo/report.jpg?X-Amz-Credential=test&X-Amz-Signature=test")).toBeNull();
  });

  it("streams an approved PDF without exposing S3 CORS to the browser", async () => {
    const upstreamFetch = vi.fn(async () => new Response("pdf-bytes", {
      status: 200,
      headers: { "content-type": "application/pdf" },
    }));
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await proxyPortalPdfDownload(new Request("https://portal.example/api/portal/pdf-download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: signedPdf }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(await response.text()).toBe("pdf-bytes");
    expect(upstreamFetch).toHaveBeenCalledWith(expect.objectContaining({ hostname: "docudent-bucket.s3.us-east-2.amazonaws.com" }), expect.objectContaining({ redirect: "manual" }));
  });

  it("rejects untrusted URLs before fetching", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);
    const response = await proxyPortalPdfDownload(new Request("https://portal.example/api/portal/pdf-download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://attacker.example/report.pdf" }),
    }));
    expect(response.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
