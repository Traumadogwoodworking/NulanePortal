import { describe, expect, it } from "vitest";
import {
  DEFINIAN_AUTH_BOOTSTRAP_ORIGIN,
  buildDefinianStartLoginUrl,
  DEFINIAN_SIGNAL_RETURN_URL,
} from "@/app/definian/start/route";

describe("Definian onboarding start route", () => {
  it("redirects the stable onboarding route to the existing signup bootstrap", () => {
    const loginUrl = buildDefinianStartLoginUrl();

    expect(loginUrl.origin).toBe(DEFINIAN_AUTH_BOOTSTRAP_ORIGIN);
    expect(loginUrl.origin).toBe("https://vercel-portal-exact.vercel.app");
    expect(loginUrl.pathname).toBe("/signup/");
    expect(loginUrl.searchParams.get("returnTo")).toBe(DEFINIAN_SIGNAL_RETURN_URL);
    expect(loginUrl.searchParams.get("returnTo")).toBe("https://www.definian.com/signal");
  });
});
