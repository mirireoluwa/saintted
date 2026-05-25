import { clearAdminCookieHeader } from "../../lib-js/adminAuth.js";

export default async function handler(
  _req: { method?: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Set-Cookie", clearAdminCookieHeader());
  return res.status(200).json({ ok: true });
}
