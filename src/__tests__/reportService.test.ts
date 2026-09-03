import { describe, expect, it } from "vitest";
import { resolveDamageReportSplatImageUrl } from "@/lib/services/reportService";
import { buildReportGallery } from "@/lib/reportGallery";
import { mergeReportDetailWithListMedia } from "@/lib/reportMedia";

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

  it("renders signed S3 photo object aliases in the report side panel gallery", () => {
    const gallery = buildReportGallery({
      report_id: "report-s3-photo",
      photos: [
        {
          signed_url: "https://inspection-photos.s3.us-east-2.amazonaws.com/report/photo.jpg?X-Amz-Signature=test",
        },
      ],
    } as never);

    expect(gallery.photoUrls).toEqual([
      "https://inspection-photos.s3.us-east-2.amazonaws.com/report/photo.jpg?X-Amz-Signature=test",
    ]);
  });

  it("keeps list photos when detail hydration returns an empty media collection", () => {
    const signedPhotoUrl =
      "https://inspection-photos.s3.us-east-2.amazonaws.com/report/photo.jpg?X-Amz-Signature=list";
    const merged = mergeReportDetailWithListMedia(
      {
        report_id: "report-hydrated",
        vin: "DETAIL-VIN",
        photo_urls: [],
        photos: [],
        damage_entries: [],
      },
      {
        report_id: "report-hydrated",
        vin: "LIST-VIN",
        photos: [{ signed_url: signedPhotoUrl }],
      }
    );

    expect(merged.vin).toBe("DETAIL-VIN");
    expect(buildReportGallery(merged as never).photoUrls).toEqual([signedPhotoUrl]);
  });

  it("uses hydrated photos when detail hydration includes media", () => {
    const merged = mergeReportDetailWithListMedia(
      {
        report_id: "report-hydrated",
        photo_urls: ["https://example.com/detail.jpg"],
      },
      {
        report_id: "report-hydrated",
        photo_urls: ["https://example.com/list.jpg"],
      }
    );

    expect(buildReportGallery(merged as never).photoUrls).toEqual(["https://example.com/detail.jpg"]);
  });
});
