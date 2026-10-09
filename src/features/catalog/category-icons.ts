import type { IconSvgElement } from "@hugeicons/react";
import {
	Apple01Icon, Bread01Icon, BodySoapIcon, CookieIcon, DrinkIcon, EggsIcon,
	FishFoodIcon, MilkBottleIcon, RiceBowl01Icon, ShoppingBasket01Icon, SnowIcon,
} from "@hugeicons/core-free-icons";
import type { ProductCategory } from "./taxonomy";

export const CATEGORY_ICONS: Record<ProductCategory, IconSvgElement> = {
	PRODUCE: Apple01Icon, DAIRY_EGGS: MilkBottleIcon, BAKERY: Bread01Icon, PANTRY: RiceBowl01Icon,
	BREAKFAST: EggsIcon, MEAT_SEAFOOD: FishFoodIcon, FROZEN: SnowIcon, SNACKS: CookieIcon,
	BEVERAGES: DrinkIcon, HOUSEHOLD: ShoppingBasket01Icon, PERSONAL_CARE: BodySoapIcon,
};
