// Not a page: CareBasket signs adults in through a dialog. Clerk still navigates here, for
// example when a signed-out visitor opens /family, so this route opens the dialog on the
// home page instead. The destination is fixed and query parameters are dropped on purpose,
// so this route can never become an open redirect.
export function GET() {
  return new Response(null, {
    status: 307,
    headers: { Location: "/?auth=sign-in" },
  });
}
