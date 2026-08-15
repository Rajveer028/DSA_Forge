import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing.
 *
 * scrypt with a per-password random salt. The cost parameters are stored inside
 * the hash string, so they can be raised later without invalidating existing
 * accounts — an old hash still verifies against its own recorded parameters.
 *
 * Format:  scrypt$N$r$p$saltHex$keyHex
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// ~64 MB of memory per hash: comfortably slow for an attacker, fine for a login.
const COST = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEM = 96 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...COST,
    maxmem: MAX_MEM,
  });
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltHex, keyHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");

  let derived: Buffer;
  try {
    derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEM,
    });
  } catch {
    return false;
  }

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Rules kept deliberately simple: length does more for safety than symbol classes. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 200) return "That password is too long.";
  if (/^\s|\s$/.test(password)) return "Remove the leading or trailing space.";
  const weak = new Set([
    "password",
    "12345678",
    "qwertyui",
    "password1",
    "11111111",
    "iloveyou",
    "dsaforge",
  ]);
  if (weak.has(password.toLowerCase())) return "That password is too common.";
  return null;
}
