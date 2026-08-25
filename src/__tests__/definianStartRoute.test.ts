import { describe, expect, it } from "vitest";
import {
  buildDefinianStartLoginUrl,
  DEFINIAN_SIGNAL_RETURN_URL,
} from "@/app/definian/start/route";

describe("Definian onboarding start route", () => {
  it("redirects the stable onboarding route to the existing login bootstrap", () => {
    const loginUrl = buildDefinianStartLoginUrl(
      "https://vercel-portal-exact-traumadogwoodworkings-projects.vercel.app/definian/start",
    );

    expect(loginUrl.origin).toBe(
      "https://vercel-portal-exact-traumadogwoodworkings-projects.vercel.app",
    );
    expect(loginUrl.pathname).toBe("/login/");
    expect(loginUrl.searchParams.get("returnTo")).toBe(DEFINIAN_SIGNAL_RETURN_URL);
    expect(loginUrl.searchParams.get("returnTo")).toBe("https://www.definian.com/signal");
  });
});
