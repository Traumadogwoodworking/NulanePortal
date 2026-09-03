import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/embedded/start/route";
import { resolveDefinianSignalParentReturnTo } from "@/portal/products/definian/auth/embeddedAuth";

describe("Definian embedded authentication handoff", () => {
  it.each([
    ["login", "/login"],
    ["signup", "/signup"],
    ["logout", "/logout"],
  ])("server-validates the %s action and pins the parent return", (action, path) => {
    const response = GET(
      new NextRequest(`https://signal.definian.com/auth/embedded/start?action=${action}&returnTo=https://evil.example`),
    );
    const location = new URL(response.headers.get("location") || "");

    expect(response.status).toBe(307);
    expect(location.origin).toBe("https://signal.definian.com");
    expect(location.pathname).toBe(path);
    expect(location.searchParams.get("returnTo")).toBe("https://www.definian.com/inspection");
    expect(location.toString()).not.toContain("evil.example");
  });

  it("defaults unknown actions to login", () => {
    const response = GET(new NextRequest("https://signal.definian.com/auth/embedded/start?action=delete"));
    expect(new URL(response.headers.get("location") || "").pathname).toBe("/login");
  });

  it("rejects parent lookalikes, query strings, and fragments", () => {
    expect(resolveDefinianSignalParentReturnTo("https://www.definian.com/inspection")).toBe(
      "https://www.definian.com/inspection",
    );
    expect(resolveDefinianSignalParentReturnTo("https://www.definian.com.evil.example/inspection")).toBeNull();
    expect(resolveDefinianSignalParentReturnTo("https://www.definian.com/inspection?next=/admin")).toBeNull();
    expect(resolveDefinianSignalParentReturnTo("https://www.definian.com/inspection#token")).toBeNull();
  });
});
