import crypto from "node:crypto";
const ADMIN_COOKIE = "saintted_admin";
function getExpectedAdminToken(password) {
  return crypto.createHmac("sha256", password).update("saintted-admin:v1").digest("hex");
}
function verifyAdminCookie(cookieHeader, password) {
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
function setAdminCookieHeader(token) {
  const secure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const parts = [`${ADMIN_COOKIE}=${token}`, "HttpOnly", "Path=/", "Max-Age=604800", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
function clearAdminCookieHeader() {
  const secure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const parts = [`${ADMIN_COOKIE}=`, "HttpOnly", "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
export {
  ADMIN_COOKIE,
  clearAdminCookieHeader,
  getExpectedAdminToken,
  setAdminCookieHeader,
  verifyAdminCookie
};
