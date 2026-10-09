This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## CareBasket catalog (Step 6)

CareBasket Demo Market is simulated. Prices are explicitly approved demo prices, not live retailer offers. No real orders or deliveries are placed; future payments use PayPal Sandbox.

Open Prices supplies historical, per-location U.S.-verified observations; Open Food Facts supplies optional metadata. Discovery and seeding are separate developer-run operations, never shopping-time provider calls. The initial dataset is intentionally empty pending human curation. Follow [the catalog setup and review guide](docs/step-6-catalog.md).

Licensing scopes:

- Application code: the project's separately chosen code license (still a release decision; do not assume a license grant from data licenses).
- [Derivative catalog](prisma/catalog/catalog.us.json): [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), attributed to Open Food Facts and Open Prices contributors and CareBasket curated demo data. Individual source contents: [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/).
- Included product images: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), documented per asset in [image attribution](public/products/ATTRIBUTION.md). No product images are included yet.

The public `/data-sources` page links to the reusable derivative dataset. The developer must ensure the public repository link is accessible before release and review license compatibility. Contributors' usernames, comments, receipts, and proofs are not redistributed.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
