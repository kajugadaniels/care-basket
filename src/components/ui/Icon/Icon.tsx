import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

type IconProps = {
  icon: IconSvgElement;
  size?: 20 | 24 | 32 | 48 | 64;
  className?: string;
};

// Icons are decorative: meaningful icons always sit next to visible text (design.md § 10).
export function Icon({ icon, size = 24, className }: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.75}
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}
