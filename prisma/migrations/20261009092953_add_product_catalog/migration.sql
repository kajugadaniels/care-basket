-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('PRODUCE', 'DAIRY_EGGS', 'BAKERY', 'PANTRY', 'BREAKFAST', 'MEAT_SEAFOOD', 'FROZEN', 'SNACKS', 'BEVERAGES', 'HOUSEHOLD', 'PERSONAL_CARE');

-- CreateEnum
CREATE TYPE "QuantityUnit" AS ENUM ('GRAM', 'MILLILITER', 'COUNT');

-- CreateEnum
CREATE TYPE "CatalogSource" AS ENUM ('OPEN_PRICES', 'CAREBASKET_CURATED');

-- CreateEnum
CREATE TYPE "PriceBasis" AS ENUM ('OBSERVED_MEDIAN', 'OBSERVED_LIMITED', 'MANUAL_DEMO');

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(60) NOT NULL,
    "barcode" VARCHAR(14),
    "displayName" VARCHAR(60) NOT NULL,
    "brand" VARCHAR(60),
    "category" "ProductCategory" NOT NULL,
    "variantGroup" VARCHAR(60) NOT NULL,
    "netQuantity" INTEGER NOT NULL,
    "netQuantityUnit" "QuantityUnit" NOT NULL,
    "sizeLabel" VARCHAR(40) NOT NULL,
    "synonyms" TEXT[],
    "imagePath" VARCHAR(200),
    "imageSourceUrl" VARCHAR(300),
    "imageProductUrl" VARCHAR(300),
    "imageLicense" VARCHAR(40),
    "imageAttribution" VARCHAR(120),
    "source" "CatalogSource" NOT NULL,
    "sourceProductId" INTEGER,
    "sourceProductCode" VARCHAR(14),
    "sourceSystem" VARCHAR(10),
    "sourceLicense" VARCHAR(40) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isChildSuitable" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoMerchantPrice" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "basis" "PriceBasis" NOT NULL,
    "observationCount" INTEGER,
    "observedFrom" DATE,
    "observedTo" DATE,
    "approvedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DemoMerchantPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_sku_key" ON "CatalogProduct"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_barcode_key" ON "CatalogProduct"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_sourceProductId_key" ON "CatalogProduct"("sourceProductId");

-- CreateIndex
CREATE INDEX "CatalogProduct_isActive_archivedAt_id_idx" ON "CatalogProduct"("isActive", "archivedAt", "id");

-- CreateIndex
CREATE INDEX "CatalogProduct_category_isActive_archivedAt_id_idx" ON "CatalogProduct"("category", "isActive", "archivedAt", "id");

-- CreateIndex
CREATE INDEX "CatalogProduct_isChildSuitable_isActive_archivedAt_id_idx" ON "CatalogProduct"("isChildSuitable", "isActive", "archivedAt", "id");

-- CreateIndex
CREATE INDEX "CatalogProduct_variantGroup_idx" ON "CatalogProduct"("variantGroup");

-- CreateIndex
CREATE INDEX "CatalogProduct_synonyms_idx" ON "CatalogProduct" USING GIN ("synonyms");

-- CreateIndex
CREATE UNIQUE INDEX "DemoMerchantPrice_productId_currency_key" ON "DemoMerchantPrice"("productId", "currency");

-- AddForeignKey
ALTER TABLE "DemoMerchantPrice" ADD CONSTRAINT "DemoMerchantPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
