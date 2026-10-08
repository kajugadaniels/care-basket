import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionLink } from "./ActionLink";
import styles from "./ActionLink.module.css";

describe("ActionLink", () => {
  it("renders an in-page anchor as a native link", () => {
    render(<ActionLink href="#how-it-works">See How It Works</ActionLink>);

    expect(screen.getByRole("link", { name: "See How It Works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
  });

  it("renders a route as a link", () => {
    render(<ActionLink href="/">Go home</ActionLink>);

    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });

  it("keeps the icon out of the accessible name", () => {
    render(
      <ActionLink href="#how-it-works" icon={ArrowDown01Icon}>
        See How It Works
      </ActionLink>,
    );

    expect(screen.getByRole("link")).toHaveAccessibleName("See How It Works");
  });

  it("is never rendered as a button", () => {
    render(<ActionLink href="#how-it-works">See How It Works</ActionLink>);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["primary", "secondary", "warning", "destructive"] as const)(
    "supports the %s intent",
    (variant) => {
      render(<ActionLink href={`#${variant}`} variant={variant}>{variant}</ActionLink>);

      expect(screen.getByRole("link", { name: variant })).toHaveClass(styles[variant]);
    },
  );

  it("supports compact, default, and large labelled sizes", () => {
    render(<>
      <ActionLink href="#small" size="sm">Small</ActionLink>
      <ActionLink href="#default">Default</ActionLink>
      <ActionLink href="#large" size="lg">Large</ActionLink>
    </>);

    expect(screen.getByRole("link", { name: "Small" })).toHaveClass(styles.sm);
    expect(screen.getByRole("link", { name: "Default" })).toHaveClass(styles.md);
    expect(screen.getByRole("link", { name: "Large" })).toHaveClass(styles.lg);
  });

  it("keeps an icon-only link labelled for assistive technology", () => {
    render(<ActionLink href="#more" size="xs" icon={ArrowDown01Icon}>Show more</ActionLink>);

    const link = screen.getByRole("link", { name: "Show more" });
    expect(link).toHaveClass(styles.iconOnly);
    expect(screen.getByText("Show more")).toHaveClass(styles.visuallyHidden);
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
