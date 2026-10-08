// Not a page: CareBasket creates family manager accounts through a dialog. Clerk may still
// navigate here, so this route opens the sign-up dialog on the home page instead. The
// destination is fixed and query parameters are dropped, so it cannot become an open redirect.
export function GET() {
  return new Response(null, {
    status: 307,
    headers: { Location: "/?auth=sign-up" },
  });
}
