import { createScriptClient, describeTarget } from "./client";
import { hashPassword, passwordProblem, verifyPassword } from "../src/lib/auth/password";

/**
 * Creates (or resets) one account, using the application's own password
 * hashing so the credential is identical to one produced by the sign-up form.
 */

const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];
const FULL_NAME = process.argv[4] ?? "Rajveer Deshmukh";

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("usage: tsx prisma/_make_account.ts <email> <password> [full name]");
    process.exit(1);
  }

  const weak = passwordProblem(PASSWORD);
  if (weak) {
    console.error(`That password would be rejected by the sign-up form: ${weak}`);
    process.exit(1);
  }

  const db = createScriptClient();
  const email = EMAIL.trim().toLowerCase();
  console.log(`\n  database  ${describeTarget()}`);
  console.log(`  email     ${email}`);

  const passwordHash = await hashPassword(PASSWORD);
  const existing = await db.userAccount.findUnique({
    where: { email },
    select: { id: true, profile: { select: { id: true } } },
  });

  let accountId: string;

  if (existing) {
    await db.userAccount.update({
      where: { id: existing.id },
      data: { passwordHash, isActive: true },
    });
    accountId = existing.id;
    console.log("  action    password reset on the existing account");

    if (!existing.profile) {
      await db.userProfile.create({
        data: {
          accountId,
          email,
          fullName: FULL_NAME,
          role: "ADMIN",
          onboardingCompleted: true,
          onboardingStep: 5,
          preferences: { create: {} },
          learningProgress: { create: {} },
        },
      });
      console.log("  action    profile created for it");
    }
  } else {
    const account = await db.userAccount.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            email,
            fullName: FULL_NAME,
            // The owner of the deployment; this unlocks /admin.
            role: "ADMIN",
            // Skipped so the first sign-in lands on the dashboard rather than
            // the five-step wizard. Everything here is editable in Settings.
            onboardingCompleted: true,
            onboardingStep: 5,
            dsaLevel: "INTERMEDIATE",
            preferences: { create: {} },
            learningProgress: { create: {} },
          },
        },
      },
      select: { id: true },
    });
    accountId = account.id;
    console.log("  action    account created");
  }

  // Prove the stored hash verifies, rather than assuming it does.
  const stored = await db.userAccount.findUnique({
    where: { id: accountId },
    select: { passwordHash: true, isActive: true, profile: { select: { fullName: true, role: true, onboardingCompleted: true } } },
  });

  const verifies = await verifyPassword(PASSWORD, stored!.passwordHash!);
  const wrongRejected = !(await verifyPassword(`${PASSWORD}x`, stored!.passwordHash!));

  console.log(`\n  password verifies          ${verifies ? "yes" : "NO"}`);
  console.log(`  wrong password rejected    ${wrongRejected ? "yes" : "NO"}`);
  console.log(`  active                     ${stored!.isActive ? "yes" : "no"}`);
  console.log(`  name                       ${stored!.profile?.fullName}`);
  console.log(`  role                       ${stored!.profile?.role}`);
  console.log(`  onboarding complete        ${stored!.profile?.onboardingCompleted ? "yes" : "no"}\n`);

  await db.$disconnect();
  process.exit(verifies && wrongRejected ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
