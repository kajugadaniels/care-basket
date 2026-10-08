import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("forwards React 19 ref props to the native button for dialog focus restoration", () => {
    const ref = createRef<HTMLButtonElement>(); render(<Button ref={ref}>Cancel</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Cancel" }));
    ref.current?.focus(); expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});
