// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /sign-in", () => {
  it("opens the sign-in dialog on the home page instead of rendering a page", () => {
    const response = GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/?auth=sign-in");
  });

  it("uses a fixed destination, so it cannot be turned into an open redirect", () => {
    // The handler takes no request input: redirect_url and other query values are ignored.
    expect(GET.length).toBe(0);
  });
});
