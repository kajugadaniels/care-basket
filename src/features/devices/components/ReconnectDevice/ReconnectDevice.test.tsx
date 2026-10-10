import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { devicesCopy } from "../../copy";
import { ReconnectDevice } from "./ReconnectDevice";

describe("device reconnection", () => {
	it("offers only reconnection without exposing a previous profile", () => {
		render(<ReconnectDevice />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(devicesCopy.reconnect);
		expect(screen.getByRole("link", { name: devicesCopy.reconnectAction })).toHaveAttribute("href", "/connect");
		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});
});
