import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("../../actions", () => ({ revokeDeviceAction: vi.fn() }));
import { DeviceList } from "./DeviceList";
import { DeviceListSkeleton } from "./DeviceListSkeleton";
describe("manager device list", () => {
  it("announces loading while its placeholder cards stay out of the accessibility tree", () => {
    render(<DeviceListSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading devices…");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("shows an understandable empty state", () => { render(<DeviceList devices={[]} />); expect(screen.getByText("No connected devices yet.")).toBeInTheDocument(); });
  it("distinguishes active, revoked, and expired devices and offers revocation only for active ones", () => {
    const base = { label: "Tablet", profileName: "Rose", userAgentSummary: "Safari on iPad",
      createdAt: "2026-10-08T12:00:00Z", lastSeenAt: "2026-10-08T12:00:00Z" };
    render(<DeviceList devices={[{ ...base, id: "1", status: "ACTIVE" }, { ...base, id: "2", status: "EXPIRED" }, { ...base, id: "3", status: "REVOKED" }]} />);
    for (const name of ["Active", "Expired", "Revoked"]) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Disconnect Device" })).toHaveLength(1);
  });
});
