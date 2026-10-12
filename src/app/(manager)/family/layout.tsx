import { Suspense, type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { SkipLink } from "@/components/ui/SkipLink/SkipLink";
import { Button } from "@/components/ui/Button/Button";
import { FamilyNav } from "@/features/family/components/FamilyNav/FamilyNav";
import { FamilyNavMenu } from "@/features/family/components/FamilyNavMenu/FamilyNavMenu";
import { familyLayoutCopy } from "@/features/family/copy";
import { RequestNotifications } from "@/features/requests/components/RequestNotifications/RequestNotifications";
import { requestNotificationsCopy } from "@/features/requests/copy";
import { requestFailure } from "@/features/requests/server/action-failure";
import { getRequestNotifications } from "@/features/requests/server/service";
import type { RequestNotificationsDto } from "@/features/requests/types";
import { userButtonAppearance } from "@/lib/clerk/appearance";
import { ensureUser } from "@/server/auth/ensure-user";
import { findFamilyMembership } from "@/server/auth/family-membership";
import styles from "./layout.module.css";

// Pages still authorize independently. Only the notification region reads private data,
// behind Suspense; its subsequent updates authenticate again through a read-only GET.
export default function FamilyLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.shell}>
      <SkipLink targetId="family-main" />
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <div className={styles.identity}>
            <Brand href="/family" />
            <span className={styles.area}>{familyLayoutCopy.areaLabel}</span>
          </div>
          <div className={styles.account}>
						<Suspense fallback={
							<Button size="xs" variant="secondary" icon={Notification01Icon} loading>
								{requestNotificationsCopy.refreshing}
							</Button>
						}>
							<FamilyRequestNotifications />
						</Suspense>
            <UserButton appearance={userButtonAppearance} />
          </div>
        </Container>
      </header>
			<Container>
				<p className={styles.environmentNotice}>{familyLayoutCopy.testEnvironment}</p>
			</Container>
      <Container className={styles.body}>
        {/* Dynamic profile IDs make usePathname suspend during prerendering. The fallback is
            the same menu without a current item, so the links are usable from the first paint. */}
        <Suspense fallback={<FamilyNavMenu />}>
          <FamilyNav />
        </Suspense>
        <main id="family-main" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </Container>
    </div>
  );
}

async function FamilyRequestNotifications() {
	const user = await ensureUser();
	const membership = await findFamilyMembership(user.id);
	// /family/setup uses this layout too, before the adult belongs to a family.
	if (!membership) return null;
	let data: RequestNotificationsDto | null = null;
	try {
		data = await getRequestNotifications({
			type: "adult", userId: user.id, familyId: membership.familyId, role: membership.role,
		});
	} catch (error) {
		requestFailure(error, "requests.notifications_failed");
	}
	return <RequestNotifications key={`${user.id}:${membership.familyId}`} initialData={data} />;
}
