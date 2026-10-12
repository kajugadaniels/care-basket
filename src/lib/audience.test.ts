import { describe, expect, it } from "vitest";
import { ACTIVE_PROFILE_KINDS, isAdultProfile } from "./audience";

describe("adults-only deployment audience", () => {
	it("permits only assisted-adult profiles", () => {
		expect(ACTIVE_PROFILE_KINDS).toEqual(["ASSISTED_ADULT"]);
		expect(isAdultProfile("ASSISTED_ADULT")).toBe(true);
	});
	it.each(["CHILD", "OWNER", "", "assisted_adult"])("denies unsupported kind %j", (kind) => {
		expect(isAdultProfile(kind)).toBe(false);
	});
});
