"use client";

import { usePathname } from "next/navigation";
import { FamilyNavMenu } from "@/features/family/components/FamilyNavMenu/FamilyNavMenu";

// A client component only because it needs the current path for aria-current.
export function FamilyNav() {
	return <FamilyNavMenu pathname={usePathname()} />;
}
