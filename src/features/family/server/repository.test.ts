// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Write = { table: string; data: Record<string, unknown> };

// A fake database whose transaction commits staged writes only if the callback succeeds,
// mirroring how PostgreSQL rolls back a failed Prisma interactive transaction.
const fake = vi.hoisted(() => {
  const committed: Write[] = [];
  const failures: { membership: Error | null; audit: Error | null } = { membership: null, audit: null };

  const db = {
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const staged: Write[] = [];
      const tx = {
        family: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            staged.push({ table: "family", data });
            return { id: "family-1", name: data.name };
          }),
        },
        familyMembership: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            if (failures.membership) {
              throw failures.membership;
            }
            staged.push({ table: "familyMembership", data });
            return { role: data.role, displayName: data.displayName };
          }),
        },
				auditLog: {
					create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
						if (failures.audit) throw failures.audit;
						staged.push({ table: "auditLog", data });
						return { id: "audit-1" };
					}),
				},
      };
      const result = await callback(tx);
      committed.push(...staged);
      return result;
    }),
    family: { create: vi.fn() },
    familyMembership: { create: vi.fn() },
  };

  return { db, committed, failures };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => fake.db }));

import { createFamilyWithOwner } from "./repository";
import { ADULT_ACCESS_CONSENT_VERSION } from "@/lib/audience";

const input = { userId: "user-1", familyName: "Jane's Family", displayName: "Jane", adultConfirmed: true as const };

describe("createFamilyWithOwner", () => {
  beforeEach(() => {
    fake.committed.length = 0;
    fake.failures.membership = null;
		fake.failures.audit = null;
    fake.db.$transaction.mockClear();
  });

  it("creates the family and the OWNER membership in one transaction", async () => {
    await expect(createFamilyWithOwner(input)).resolves.toEqual({
      familyId: "family-1",
      familyName: "Jane's Family",
      role: "OWNER",
      displayName: "Jane",
    });

    expect(fake.db.$transaction).toHaveBeenCalledTimes(1);
    expect(fake.committed).toEqual([
      { table: "family", data: { name: "Jane's Family" } },
      {
        table: "familyMembership",
        data: { familyId: "family-1", userId: "user-1", role: "OWNER", displayName: "Jane" },
      },
			{
				table: "auditLog",
				data: {
					familyId: "family-1", actorType: "ADULT", actorId: "user-1",
					action: `family.created.${ADULT_ACCESS_CONSENT_VERSION}`, targetType: "Family", targetId: "family-1",
				},
			},
    ]);
  });

  it("rolls back both records when the membership cannot be created", async () => {
    const duplicate = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    fake.failures.membership = duplicate;

    await expect(createFamilyWithOwner(input)).rejects.toBe(duplicate);
    expect(fake.committed).toEqual([]);
  });

  it("never writes outside the transaction", async () => {
    await createFamilyWithOwner(input);

    expect(fake.db.family.create).not.toHaveBeenCalled();
    expect(fake.db.familyMembership.create).not.toHaveBeenCalled();
  });

	it("rolls back setup if the self-attestation audit cannot be saved", async () => {
		fake.failures.audit = new Error("audit failed");
		await expect(createFamilyWithOwner(input)).rejects.toThrow("audit failed");
		expect(fake.committed).toEqual([]);
	});
});
