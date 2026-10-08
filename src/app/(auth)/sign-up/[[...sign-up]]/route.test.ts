// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /sign-up", () => {
  it("opens the sign-up dialog on the home page instead of rendering a page", () => {
    const response = GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/?auth=sign-up");
  });
});
