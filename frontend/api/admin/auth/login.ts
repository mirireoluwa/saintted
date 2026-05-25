import { getExpectedAdminToken, setAdminCookieHeader } from "../../lib-js/adminAuth.js";

export default async function handler(
  req: { method?: string; body?: { password?: string } },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return res.status(503).json({ ok: false, message: "ADMIN_PASSWORD is not set on the server" });
  }

  const provided = typeof req.body?.password === "string" ? req.body.password : "";
  if (!provided || provided !== password) {
    return res.status(401).json({ ok: false, message: "Invalid password" });
  }

  const token = getExpectedAdminToken(password);
  res.setHeader("Set-Cookie", setAdminCookieHeader(token));
  return res.status(200).json({ ok: true });
}
