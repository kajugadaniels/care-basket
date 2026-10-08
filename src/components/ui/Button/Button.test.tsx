import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import styles from "./Button.module.css";

describe("Button", () => {
  it("forwards React 19 ref props to the native button for dialog focus restoration", () => {
    const ref = createRef<HTMLButtonElement>(); render(<Button ref={ref}>Cancel</Button>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Cancel" }));
    ref.current?.focus(); expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it.each(["primary", "secondary", "warning", "destructive"] as const)(
    "supports the %s intent",
    (variant) => {
      render(<Button variant={variant}>{variant}</Button>);

      expect(screen.getByRole("button", { name: variant })).toHaveClass(styles[variant]);
    },
  );

  it("supports compact, default, and large labelled sizes", () => {
    render(<>
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </>);

    expect(screen.getByRole("button", { name: "Small" })).toHaveClass(styles.sm);
    expect(screen.getByRole("button", { name: "Default" })).toHaveClass(styles.md);
    expect(screen.getByRole("button", { name: "Large" })).toHaveClass(styles.lg);
  });

  it("keeps an icon-only button labelled for assistive technology", () => {
    render(<Button size="xs" icon={ArrowDown01Icon}>Show more</Button>);

    const button = screen.getByRole("button", { name: "Show more" });
    expect(button).toHaveClass(styles.iconOnly);
    expect(screen.getByText("Show more")).toHaveClass(styles.visuallyHidden);
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
