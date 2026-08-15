import "dotenv/config";
import { createScriptClient } from "./client";
import { DEV_UNIVERSITY } from "./seed-data/reference";

/**
 * Grants faculty access to an existing account.
 *
 * Faculty rights are never self-service: this script is the deliberate
 * out-of-band step an administrator takes. Run it after the person has signed
 * in at least once so their profile exists.
 *
 *   npm run make:faculty -- someone@university.edu
 *   npm run make:faculty -- someone@university.edu --admin
 */

const db = createScriptClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith("--"))?.toLowerCase();
  const alsoPlatformAdmin = args.includes("--admin");

  if (!email) {
    console.error("Usage: npm run make:faculty -- <email> [--admin]");
    process.exit(1);
  }

  const profile = await db.userProfile.findFirst({
    where: { email },
    select: { id: true, fullName: true, email: true },
  });

  if (!profile) {
    console.error(
      `No DSA Forge profile found for ${email}.\nAsk them to sign in and finish onboarding once, then run this again.`,
    );
    process.exit(1);
  }

  const university = await db.university.findUnique({
    where: { slug: DEV_UNIVERSITY.slug },
    select: { id: true, name: true },
  });

  if (!university) {
    console.error("The sample university does not exist yet. Run `npm run db:seed` first.");
    process.exit(1);
  }

  await db.universityMember.upsert({
    where: { universityId_userId: { universityId: university.id, userId: profile.id } },
    create: {
      universityId: university.id,
      userId: profile.id,
      role: "FACULTY",
      department: "Computer Science",
      isApproved: true,
    },
    update: { role: "FACULTY", isApproved: true },
  });

  if (alsoPlatformAdmin) {
    await db.userProfile.update({ where: { id: profile.id }, data: { role: "ADMIN" } });
  }

  console.log(
    `\n${profile.fullName} <${profile.email}> is now FACULTY at ${university.name}${
      alsoPlatformAdmin ? " and a platform ADMIN" : ""
    }.\n`,
  );
  console.log("Re-run `npm run db:seed` to create the sample question bank and assessment.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
