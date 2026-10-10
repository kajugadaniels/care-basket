import { redirect } from "next/navigation";

// Existing pairing destinations and bookmarks still open the new start screen.
// The assistant authenticates the device before reading any profile data.
export default function ShopPage() {
	redirect("/shop/assistant");
}
