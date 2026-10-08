import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/errors";
import { makeDeviceActor } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ device: vi.fn(), shop: vi.fn() }));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/features/devices/server/service", () => ({ getShopHome: fake.shop }));
import ShopPage from "./page";
describe("shop route actor isolation", () => {
  beforeEach(() => vi.resetAllMocks());
  it("uses only the device actor and assigned profile", async () => {
    fake.device.mockResolvedValue(makeDeviceActor()); fake.shop.mockResolvedValue({ displayName: "Rose", avatarKey: "flower" });
    render(await ShopPage()); expect(fake.shop).toHaveBeenCalledWith(makeDeviceActor());
    expect(screen.getByRole("heading", { name: "Hello, Rose!" })).toBeInTheDocument();
  });
  it("does not load a private profile after invalid, expired, or revoked authentication", async () => {
    fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED")); render(await ShopPage());
    expect(fake.shop).not.toHaveBeenCalled(); expect(screen.getByRole("link", { name: "Connect Again" })).toHaveAttribute("href", "/connect");
  });
});
