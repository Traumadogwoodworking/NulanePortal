import { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";

const auth0Mocks = vi.hoisted(() => ({
  createAuth0Client: vi.fn(),
  handleRedirectCallback: vi.fn(),
  getTokenSilently: vi.fn(),
}));

vi.mock("@auth0/auth0-spa-js", () => ({
  createAuth0Client: auth0Mocks.createAuth0Client,
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/auth/callback/?code=callback-code&state=callback-state");
  auth0Mocks.handleRedirectCallback.mockImplementation(() => new Promise(() => undefined));
  auth0Mocks.createAuth0Client.mockResolvedValue({
    handleRedirectCallback: auth0Mocks.handleRedirectCallback,
    getTokenSilently: auth0Mocks.getTokenSilently,
  });
});

describe("AuthCallbackClient Strict Mode ownership", () => {
  it("may invoke the facade twice on remount but consumes the Auth0 transaction once", async () => {
    render(
      <StrictMode>
        <AuthCallbackClient />
      </StrictMode>
    );

    await waitFor(() => {
      expect(auth0Mocks.handleRedirectCallback).toHaveBeenCalledTimes(1);
    });
    expect(auth0Mocks.createAuth0Client).toHaveBeenCalledTimes(1);
  });
});
