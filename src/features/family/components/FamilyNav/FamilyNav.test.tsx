import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ path: "/family" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.path }));
import { FamilyNav } from "./FamilyNav";

describe("FamilyNav", () => {
  beforeEach(() => { mocks.path = "/family"; });
  it.each(["/family/members", "/family/members/add", "/family/members/profile-rose", "/family/members/profile-rose/edit"])(
    "keeps Family Members active at %s", (path) => {
      mocks.path = path;
      render(<FamilyNav />);
      expect(screen.getByRole("link", { name: "Family Members" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    },
  );
  it.each(["/family/devices", "/family/devices/connect"])("keeps Devices active at %s", (path) => {
    mocks.path = path;
    render(<FamilyNav />);
    expect(screen.getByRole("link", { name: "Devices" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Family Members" })).not.toHaveAttribute("aria-current");
  });
  it("offers only implemented overview, member, and device routes", () => {
    render(<FamilyNav />);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/family", "/family/members", "/family/devices"]);
  });
});
