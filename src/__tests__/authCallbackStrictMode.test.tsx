import { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";

const auth0Mocks = vi.hoisted(() => ({
  createAuth0Client: vi.fn(),
  handleRedirectCallback: vi.fn(),
  getTokenSilently: vi.fn(),
  loginWithRedirect: vi.fn(),
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
    loginWithRedirect: auth0Mocks.loginWithRedirect,
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

  it("restarts the preserved signup flow when the callback URL lost its query parameters", async () => {
    window.history.replaceState({}, "", "/auth/callback/");
    window.sessionStorage.setItem("portal_auth_login_action", "signup");
    window.sessionStorage.setItem("portal_login_return_to", "https://www.definian.com/inspection");
    auth0Mocks.loginWithRedirect.mockResolvedValue(undefined);

    render(<AuthCallbackClient />);

    await waitFor(() => {
      expect(auth0Mocks.loginWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          appState: { returnTo: "https://www.definian.com/inspection" },
          authorizationParams: expect.objectContaining({ screen_hint: "signup" }),
        }),
      );
    });
    expect(auth0Mocks.handleRedirectCallback).not.toHaveBeenCalled();
  });
});
