import { verifyAdminCookie } from "../../lib-js/adminAuth.js";

export default async function handler(
  req: { method?: string; headers?: { cookie?: string } },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");

  const password = process.env.ADMIN_PASSWORD;
  if (!verifyAdminCookie(req.headers?.cookie, password)) {
    return res.status(401).json({ ok: false });
  }

  return res.status(200).json({ ok: true });
}
