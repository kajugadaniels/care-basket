import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { devicesCopy } from "@/features/devices/copy";
import { AppError } from "@/server/errors";
import { deviceIds, makeDeviceAdult } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ adult: vi.fn(), list: vi.fn(), profile: vi.fn() }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/features/profiles/server/service", () => ({ listManagedProfiles: fake.list, getManagedProfile: fake.profile }));
vi.mock("@/features/devices/components/ApprovalForm/ApprovalForm", () => ({ ApprovalForm: ({ preselected }: { preselected?: string }) => <output aria-label="Suggested person">{preselected ?? "none"}</output> }));
import DeviceConnectPage from "./page";
import DeviceConnectLoading from "./loading";
describe("manager approval route", () => {
  beforeEach(() => {
    vi.resetAllMocks(); fake.adult.mockResolvedValue(makeDeviceAdult());
    fake.list.mockResolvedValue({ profiles: [{ id: deviceIds.profile, displayName: "Rose" }], nextCursor: null });
  });
  it("authenticates before loading profiles", async () => {
    fake.adult.mockRejectedValue(new Error("SIGN_IN"));
    await expect(DeviceConnectPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("SIGN_IN"); expect(fake.list).not.toHaveBeenCalled();
  });
  it("provides an immediate loading state for the nested approval route", () => {
    render(<DeviceConnectLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(devicesCopy.loading);
  });
  it("ignores a cross-family preselection rather than treating the URL as authorization", async () => {
    fake.profile.mockRejectedValue(new AppError("NOT_FOUND"));
    render(await DeviceConnectPage({ searchParams: Promise.resolve({ profileId: deviceIds.otherFamily }) }));
    expect(fake.profile).toHaveBeenCalledWith(makeDeviceAdult(), deviceIds.otherFamily);
    expect(screen.getByLabelText("Suggested person")).toHaveTextContent("none");
  });
});
