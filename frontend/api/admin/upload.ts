import { put } from "@vercel/blob";
import { verifyAdminCookie } from "../lib-js/adminAuth.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  body?: { filename?: string; dataUrl?: string };
};

function dataUrlToBuffer(dataUrl: string): { buf: Buffer; contentType: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  try {
    return { buf: Buffer.from(m[2], "base64"), contentType: m[1] };
  } catch {
    return null;
  }
}

const MAX_BYTES = 4 * 1024 * 1024;

export default async function handler(
  req: Req,
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
  if (!password) return res.status(503).json({ ok: false, message: "ADMIN_PASSWORD not set" });
  if (!verifyAdminCookie(req.headers?.cookie, password)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      ok: false,
      message: "Vercel Blob not configured. Add BLOB_READ_WRITE_TOKEN in Vercel env vars.",
    });
  }

  const filename =
    typeof req.body?.filename === "string" && req.body.filename.trim()
      ? req.body.filename.trim().replace(/[^a-zA-Z0-9._-]/g, "_")
      : "upload.bin";

  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  if (!dataUrl) return res.status(400).json({ ok: false, message: "dataUrl is required" });

  const parsed = dataUrlToBuffer(dataUrl);
  if (!parsed) return res.status(400).json({ ok: false, message: "Invalid data URL" });

  const { buf, contentType } = parsed;
  if (buf.length === 0) return res.status(400).json({ ok: false, message: "Empty file" });
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({
      ok: false,
      message: "File too large (max 4 MB). For large videos use a URL instead.",
    });
  }

  try {
    const blob = await put(`saintted/${Date.now()}-${filename}`, buf, {
      access: "public",
      addRandomSuffix: true,
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res.status(200).json({ ok: true, url: blob.url });
  } catch (e) {
    console.error("blob upload error:", e);
    const raw = e instanceof Error ? e.message : String(e);
    const message = /token|unauthori|forbidden|401|403/i.test(raw)
      ? `Blob auth failed: ${raw.slice(0, 160)}. Check BLOB_READ_WRITE_TOKEN in Vercel.`
      : raw.length < 180 ? raw : "Blob upload failed.";
    return res.status(500).json({ ok: false, message });
  }
}
