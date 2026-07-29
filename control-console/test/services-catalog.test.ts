import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_CATALOG,
  PRODUCT_COMPONENT_CATALOG,
  SERVICE_MONITOR_CATALOG
} from "../lib/services/catalog";

test("Inspection Trac and DocuDent are registered as products with real source paths", () => {
  assert.deepEqual(PRODUCT_CATALOG.map((product) => product.code), ["INS", "DOC"]);
  assert.ok(PRODUCT_CATALOG.every((product) => product.repositoryPath.startsWith("/Users/home/Desktop/Codex/")));
  assert.deepEqual(
    PRODUCT_COMPONENT_CATALOG.filter((component) => component.projectCode === "INS").map((component) => component.code),
    ["mobile", "api", "portal"]
  );
  assert.deepEqual(
    PRODUCT_COMPONENT_CATALOG.filter((component) => component.projectCode === "DOC").map((component) => component.code),
    ["mobile", "api"]
  );
});

test("service monitors contain the production Inspection Trac and DocuDent API endpoints", () => {
  const bySlug = new Map(SERVICE_MONITOR_CATALOG.map((monitor) => [monitor.slug, monitor]));
  assert.equal(bySlug.get("inspection-trac-api")?.endpointUrl, "https://api.nulanesystems.com/inspection-trac/api/status");
  assert.equal(bySlug.get("docudent-api")?.endpointUrl, "https://api.nulanesystems.com/health");
  assert.equal(new Set(SERVICE_MONITOR_CATALOG.map((monitor) => monitor.slug)).size, SERVICE_MONITOR_CATALOG.length);
});
