"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProfile } from "@/lib/auth/session";
import { onboardingSchema } from "@/lib/validation/schemas";
import { refreshRecommendations } from "@/lib/analytics/adaptive";
import { evaluateAchievements } from "@/lib/analytics/achievements";
import { notify } from "@/lib/notifications";

export interface OnboardingState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Persists the onboarding wizard. The Clerk session identifies the user — the
 * form never carries a user id.
 */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const profile = await requireProfile();

  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    college: formData.get("college"),
    degree: formData.get("degree"),
    branch: formData.get("branch"),
    academicYear: formData.get("academicYear"),
    rollNumber: formData.get("rollNumber") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    languages: formData.getAll("languages"),
    dsaLevel: formData.get("dsaLevel"),
    topics: formData.getAll("topics"),
    careerGoals: formData.getAll("careerGoals"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    const topics = await db.topic.findMany({
      where: { slug: { in: data.topics } },
      select: { id: true },
    });

    await db.$transaction([
      db.userProfile.update({
        where: { id: profile.id },
        data: {
          fullName: data.fullName,
          college: data.college,
          degree: data.degree,
          branch: data.branch,
          academicYear: data.academicYear,
          rollNumber: data.rollNumber || null,
          imageUrl: data.imageUrl || profile.imageUrl,
          languages: data.languages,
          dsaLevel: data.dsaLevel,
          careerGoals: data.careerGoals,
          onboardingCompleted: true,
          onboardingStep: 5,
          lastActiveAt: new Date(),
        },
      }),
      db.userPreferences.upsert({
        where: { userId: profile.id },
        create: { userId: profile.id, defaultLanguage: data.languages[0] },
        update: { defaultLanguage: data.languages[0] },
      }),
      db.userTopicInterest.deleteMany({ where: { userId: profile.id } }),
      db.userTopicInterest.createMany({
        data: topics.map((topic) => ({ userId: profile.id, topicId: topic.id }))
      }),
      db.learningProgress.upsert({
        where: { userId: profile.id },
        create: { userId: profile.id },
        update: {},
      }),
    ]);

    await notify({
      userId: profile.id,
      kind: "SYSTEM",
      title: "Welcome to DSA Forge",
      body: "Your profile is set up. Head to the Practice Arena and solve your first problem.",
      href: "/practice",
      icon: "Sparkles",
    });

    // Seed the first learning path so the dashboard is never empty.
    await refreshRecommendations(profile.id).catch(() => undefined);
    await evaluateAchievements(profile.id).catch(() => undefined);

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[onboarding]", error);
    return {
      ok: false,
      error:
        "We could not save your profile. Check that the database is reachable and try again.",
    };
  }
}

/** Lightweight step tracking so a partially finished wizard can be resumed. */
export async function saveOnboardingStep(step: number) {
  const profile = await requireProfile();
  await db.userProfile.update({
    where: { id: profile.id },
    data: { onboardingStep: Math.max(0, Math.min(5, step)) },
  });
}
