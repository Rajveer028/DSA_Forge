import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import type { AuthedProfile } from "@/lib/auth/session";
import { getMemberships, isFacultyRole } from "@/lib/auth/permissions";

/**
 * Host context for creating a test.
 *
 * Every test belongs to a university, because that ownership is what the rest
 * of the portal authorises against. But a person who just wants to run one
 * assessment for a few friends has no institution to join first, so the first
 * time they host a test they get their own workspace: a University row they
 * are FACULTY of, holding only their own tests and questions.
 *
 * If they already teach somewhere, that membership is used instead and nothing
 * is created — a lecturer's tests stay inside their real institution.
 */

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

/** Workspace join codes are institution-level and separate from test codes. */
function workspaceJoinCode() {
  const alphabet = "ACDEFGHJKMNPQRTUVWXY34679";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += alphabet[randomInt(alphabet.length)];
  return `WS-${code}`;
}

export interface HostContext {
  universityId: string;
  universityName: string;
  /** True when this call created the workspace. */
  created: boolean;
}

export async function ensureHostContext(profile: AuthedProfile): Promise<HostContext> {
  const memberships = await getMemberships(profile);

  const faculty = memberships.find((membership) => isFacultyRole(membership.role));
  if (faculty) {
    return {
      universityId: faculty.universityId,
      universityName: faculty.university.name,
      created: false,
    };
  }

  const displayName = profile.fullName?.trim() || profile.email?.split("@")[0] || "Host";
  const name = `${displayName}'s workspace`;

  // Slug and join code both carry a unique index; retry a few times rather
  // than fail the whole request on an unlucky collision.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomInt(1000, 9999)}`;
    try {
      const university = await db.university.create({
        data: {
          slug: `${slugify(displayName)}${suffix}`,
          name,
          shortName: displayName.slice(0, 40),
          joinCode: workspaceJoinCode(),
          members: {
            create: {
              userId: profile.id,
              // Hosting your own workspace means running it.
              role: "ADMIN",
              isApproved: true,
              department: profile.branch,
              year: profile.academicYear,
              rollNumber: profile.rollNumber,
            },
          },
        },
        select: { id: true, name: true },
      });
      return { universityId: university.id, universityName: university.name, created: true };
    } catch {
      // Unique constraint on slug or joinCode — try another suffix.
    }
  }

  throw new Error("Could not create a workspace for this account. Please try again.");
}
