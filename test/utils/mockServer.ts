import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import measurements from "../fixtures/measurements.json";

const apiBase = "https://api.nulanesystems.com/api";
const inspectionApiBase = "https://api.nulanesystems.com/inspection-trac/api";

const handlers = [
  http.get(`${apiBase}/measurements`, ({ request }) => {
    const latest = new URL(request.url).searchParams.get("latest");
    if (latest) {
      return HttpResponse.json(measurements.slice(-10), { status: 200 });
    }
    return HttpResponse.json(measurements, { status: 200 });
  }),

  http.post(`${apiBase}/docufit/pdf`, () => {
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  http.post(`${apiBase}/photos/upload`, () => {
    return HttpResponse.json(
      {
        photo_urls: ["https://nulanesystems.com/media/mock-upload.png"],
      },
      { status: 200 }
    );
  }),

  http.post(`${apiBase}/docufit/uploads`, () => {
    return HttpResponse.json(
      {
        upload_id: "mock-upload",
        status: "queued",
      },
      { status: 200 }
    );
  }),

  http.post(`${apiBase}/ai/otto/chat`, () => {
    return HttpResponse.json(
      {
        answer: "Mocked assistive reply",
        sources: [],
        diagnostics: { mode: "mock" },
      },
      { status: 200 }
    );
  }),

  http.get(`${apiBase}/vin/:vin`, () => {
    return HttpResponse.json(
      {
        status: "verified",
        label: "Verified VIN",
        message: "VIN check passed",
      },
      { status: 200 }
    );
  }),

  http.get(`${inspectionApiBase}/vin/:vin`, () => {
    return HttpResponse.json(
      {
        status: "verified",
        label: "Verified VIN",
        message: "VIN check passed",
      },
      { status: 200 }
    );
  }),

  http.get(`${apiBase}/report/pull`, () => {
    return HttpResponse.json(
      {
        reports: [
          {
            report_id: "damage-001",
            make: "Atlas",
            model: "Rover",
            year: "2025",
            vin: "1HGBH41JXMN109186",
            status: "open",
            inspector_email: "ops@example.com",
            damage_entries: [],
            splat_urls: [],
            splatImageUrl: "https://example.com/splat.png",
          },
        ],
      },
      { status: 200 }
    );
  }),

  http.get(`${apiBase}/railcar-scans/report/pull`, () => {
    return HttpResponse.json(
      {
        reports: [],
      },
      { status: 200 }
    );
  }),
];

export const server = setupServer(...handlers);
