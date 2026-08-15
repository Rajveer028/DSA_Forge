import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TOPICS } from "@/lib/constants";
import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Set up your profile" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboardingCompleted) redirect("/dashboard");

  // Topics come from the database so the catalogue stays the single source of
  // truth; the constant is only the seed fallback.
  const topics = await db.topic
    .findMany({ orderBy: { orderIndex: "asc" }, select: { slug: true, name: true, category: true } })
    .catch(() => []);

  return (
    <OnboardingWizard
      defaults={{
        fullName: profile.fullName,
        imageUrl: profile.imageUrl ?? "",
        college: profile.college ?? "",
        degree: profile.degree ?? "",
        branch: profile.branch ?? "",
        academicYear: profile.academicYear ?? "",
        rollNumber: profile.rollNumber ?? "",
      }}
      topics={topics.length > 0 ? topics : TOPICS.map(({ slug, name, category }) => ({ slug, name, category }))}
    />
  );
}
