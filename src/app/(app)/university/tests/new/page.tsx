import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { requireFaculty } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { CreateTestForm } from "@/components/university/create-test-form";

export const metadata: Metadata = { title: "Create test" };
export const dynamic = "force-dynamic";

export default async function CreateTestPage() {
  const profile = await requireOnboarded();
  const { universityId } = await requireFaculty(profile);

  const classes = await db.universityClass.findMany({
    where: { universityId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, department: true, year: true, division: true },
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="University · Faculty"
        title="Create test"
        description="Set the window, the marking scheme and the student capacity. You will add questions and assign students next."
        icon={FilePlus2}
        accent="success"
      />
      <CreateTestForm classes={classes} />
    </PageShell>
  );
}
