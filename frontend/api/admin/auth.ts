import {
  verifyAdminCookie,
  getExpectedAdminToken,
  setAdminCookieHeader,
  clearAdminCookieHeader,
} from "../_lib-js/adminAuth.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  body?: { password?: string };
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
      return res.status(401).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearAdminCookieHeader());
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST") {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return res.status(503).json({ ok: false, message: "ADMIN_PASSWORD is not set" });
    const provided = typeof req.body?.password === "string" ? req.body.password : "";
    if (!provided || provided !== password) {
      return res.status(401).json({ ok: false, message: "Invalid password" });
    }
    const token = getExpectedAdminToken(password);
    res.setHeader("Set-Cookie", setAdminCookieHeader(token));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
