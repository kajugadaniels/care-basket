import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionLink } from "./ActionLink";

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
});
