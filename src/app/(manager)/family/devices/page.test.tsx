import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDeviceAdult } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ adult: vi.fn(), list: vi.fn() }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/features/devices/server/service", () => ({ listDevices: fake.list }));
vi.mock("@/features/devices/actions", () => ({ revokeDeviceAction: vi.fn() }));
import DevicesPage from "./page";
describe("manager device list route", () => {
  beforeEach(() => { vi.resetAllMocks(); fake.adult.mockResolvedValue(makeDeviceAdult()); fake.list.mockResolvedValue({ devices: [], nextCursor: null }); });
  it("loads the server-resolved adult's own devices and offers the implemented connection route", async () => {
    render(await DevicesPage({ searchParams: Promise.resolve({}) }));
    expect(fake.list).toHaveBeenCalledWith(makeDeviceAdult(), {});
    expect(screen.getByRole("link", { name: "Connect a Device" })).toHaveAttribute("href", "/family/devices/connect");
  });
  it("cannot load device data with only a requester session", async () => {
    fake.adult.mockRejectedValue(new Error("SIGN_IN"));
    await expect(DevicesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("SIGN_IN"); expect(fake.list).not.toHaveBeenCalled();
  });
});
