import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceTestNow } from "@/test/factories/devices";
import { usePairingStatus } from "./use-pairing-status";
describe("visible-only pairing polling", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(deviceTestNow); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fetchMock.mockImplementation(async () => Response.json({ data: { status: "PENDING" } }));
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  const expires = new Date(deviceTestNow.getTime() + 600_000).toISOString();
  it("polls every 15 seconds while visible and stops when hidden", async () => {
    renderHook(() => usePairingStatus(expires, 0));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); }); expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); }); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("stops after approval and never performs completion in the GET poll", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: { status: "APPROVED" } }));
    const { result } = renderHook(() => usePairingStatus(expires, 0));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(result.current.status).toBe("APPROVED"); expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/pairing/status", expect.objectContaining({ cache: "no-store", credentials: "same-origin" }));
  });
  it("honors Retry-After before making another status request", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "120" } }));
    const { result } = renderHook(() => usePairingStatus(expires, 0));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.hasError).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(119_999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.hasError).toBe(false);
  });
  it("warns before expiration and offers recovery after network errors", async () => {
    fetchMock.mockRejectedValue(new Error("offline")); const { result } = renderHook(() => usePairingStatus(expires, 0));
    await act(async () => { await vi.advanceTimersByTimeAsync(540_000); });
    expect(result.current.hasError).toBe(true); expect(result.current.isExpiring).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); }); expect(result.current.status).toBe("EXPIRED");
  });
});
