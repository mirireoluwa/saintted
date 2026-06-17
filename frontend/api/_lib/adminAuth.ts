import crypto from "node:crypto";

export const ADMIN_COOKIE = "saintted_admin";

export function getExpectedAdminToken(password: string): string {
  return crypto.createHmac("sha256", password).update("saintted-admin:v1").digest("hex");
}

export function verifyAdminCookie(
  cookieHeader: string | undefined,
  password: string | undefined
): boolean {
  if (!password?.length || !cookieHeader) return false;
  const expected = getExpectedAdminToken(password);
  const escaped = ADMIN_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`${escaped}=([^;]+)`));
  if (!match) return false;
  const got = match[1].trim();
  if (got.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export function setAdminCookieHeader(token: string): string {
  const secure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const parts = [`${ADMIN_COOKIE}=${token}`, "HttpOnly", "Path=/", "Max-Age=604800", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearAdminCookieHeader(): string {
  const secure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const parts = [`${ADMIN_COOKIE}=`, "HttpOnly", "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
