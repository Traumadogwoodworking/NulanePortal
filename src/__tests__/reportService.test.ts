import { describe, expect, it } from "vitest";
import { resolveDamageReportSplatImageUrl } from "@/lib/services/reportService";
import { buildReportGallery } from "@/lib/reportGallery";

describe("reportService splat normalization", () => {
  it("prefers the canonical splat field across legacy aliases", () => {
    expect(
      resolveDamageReportSplatImageUrl({
        report_id: "report-1",
        splatImageUrl: "https://example.com/canonical.png",
        splat_url: "https://example.com/legacy-url.png",
        splat_urls: ["https://example.com/list.png"],
      })
    ).toBe("https://example.com/canonical.png");

    expect(
      resolveDamageReportSplatImageUrl({
        report_id: "report-2",
        splat_url: "https://example.com/legacy-url.png",
        splat_urls: ["https://example.com/list.png"],
      })
    ).toBe("https://example.com/legacy-url.png");
  });

  it("keeps compatibility arrays while exposing the canonical gallery url", () => {
    const gallery = buildReportGallery({
      report_id: "report-3",
      splatImageUrl: "https://example.com/canonical.png",
      splat_urls: ["https://example.com/list.png"],
      damage_entries: [
        {
          photos: [{ url: "https://example.com/damage-photo.png" }],
        },
      ],
    } as never);

    expect(gallery.galleryUrls).toContain("https://example.com/canonical.png");
    expect(gallery.galleryUrls).toContain("https://example.com/list.png");
    expect(gallery.photoUrls).toContain("https://example.com/damage-photo.png");
  });
});
